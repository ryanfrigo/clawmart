/**
 * USDC-on-Base crypto rail — the no-KYC payment option.
 *
 * A buyer pays an exact, order-unique USDC amount to the PAYMENT_ADDRESS
 * (receive-only config, already public). We verify the payment read-only via a
 * public Base RPC (no key, no KYC) by matching an ERC-20 Transfer to our
 * address for the exact expected amount, then unlock the download. We never
 * move funds and never touch a private key — this only observes inbound
 * transfers and displays the receive address for its intended purpose.
 */

import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { checksumToken } from "./lib/pure";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const ALLOWED_USD = new Set([39, 99]);
// Cap the log-scan window so a stale order can't ask the RPC for a huge range.
const MAX_SCAN_BLOCKS = 60_000; // ~1.5 days of Base blocks

function requireSecret(provided: string): void {
  const expected = process.env.SERVER_SHARED_SECRET;
  if (!expected || provided !== expected) throw new ConvexError("unauthorized");
}

function paymentAddress(): string {
  const a = process.env.PAYMENT_ADDRESS;
  if (!a || !/^0x[0-9a-fA-F]{40}$/.test(a)) {
    throw new ConvexError("payment_address_unset");
  }
  return a.toLowerCase();
}

/** Exact order amount in USDC micro-units: base price + a token-derived offset
 *  (0.000001–0.009999) so each order's amount is unique for on-chain matching. */
function expectedMicro(amountUsd: number, token: string): number {
  const offset = (parseInt(token.slice(0, 6), 16) % 9999) + 1;
  return amountUsd * 1_000_000 + offset;
}

export const createCryptoPending = mutation({
  args: {
    slug: v.string(),
    amountUsd: v.number(),
    title: v.string(),
    fromBlock: v.number(),
    ipHash: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireSecret(args.secret);
    if (!ALLOWED_USD.has(args.amountUsd)) throw new ConvexError("invalid_amount");
    // reuse the same per-IP throttle as card checkout
    if (args.ipHash) {
      const key = `checkout-ip:${args.ipHash}`;
      const now = Date.now();
      const rl = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      const WINDOW = 60 * 60 * 1000;
      if (!rl || now - rl.windowStart > WINDOW) {
        if (rl) await ctx.db.patch(rl._id, { windowStart: now, count: 1 });
        else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
      } else if (rl.count >= 12) {
        throw new ConvexError("rate_limited");
      } else {
        await ctx.db.patch(rl._id, { count: rl.count + 1 });
      }
    }
    const token = checksumToken();
    const micro = expectedMicro(args.amountUsd, token);
    await ctx.db.insert("purchases", {
      token,
      slug: args.slug,
      title: args.title.slice(0, 200),
      status: "pending_payment",
      amountUsd: args.amountUsd,
      paymentMethod: "crypto",
      expectedUsdcMicro: micro,
      cryptoFromBlock: args.fromBlock,
      createdAt: Date.now(),
    });
    return { token, expectedUsdcMicro: micro };
  },
});

/** Public read for the /pay page (safe fields only). */
export const getCryptoByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("purchases")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!p || p.paymentMethod !== "crypto") return null;
    return {
      status: p.status,
      slug: p.slug,
      amountUsd: p.amountUsd,
      expectedUsdcMicro: p.expectedUsdcMicro ?? 0,
    };
  },
});

export const forVerify = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("purchases")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!p) return null;
    return {
      id: p._id,
      status: p.status,
      method: p.paymentMethod,
      micro: p.expectedUsdcMicro ?? 0,
      fromBlock: p.cryptoFromBlock ?? 0,
    };
  },
});

export const markPaidCrypto = internalMutation({
  args: { purchaseId: v.id("purchases"), txHash: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.purchaseId);
    if (!p || p.status !== "pending_payment") return { transitioned: false };
    // Crypto delivery is on-page (the /pay panel reveals the download on paid);
    // no email is collected on this rail, so nothing to send.
    await ctx.db.patch(args.purchaseId, {
      status: "paid",
      paidAt: Date.now(),
      cryptoTxHash: args.txHash,
    });
    return { transitioned: true };
  },
});

async function rpc(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await res.json()) as { result?: string; error?: unknown };
  if (j.error || j.result === undefined) {
    throw new Error(`rpc_${method}_failed`);
  }
  return j.result as string;
}

interface Log {
  data: string;
  topics: string[];
  transactionHash: string;
}

/** Poll Base for a USDC transfer to our address matching the exact amount. */
export const verify = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ paid: boolean }> => {
    const order = await ctx.runQuery(internal.crypto.forVerify, {
      token: args.token,
    });
    if (!order) return { paid: false };
    if (order.status === "paid") return { paid: true };
    if (order.method !== "crypto" || order.micro <= 0) return { paid: false };

    const addr = paymentAddress();
    const paddedTo = "0x" + addr.slice(2).padStart(64, "0");
    const latest = parseInt(await rpc("eth_blockNumber", []), 16);
    const from = Math.max(order.fromBlock, latest - MAX_SCAN_BLOCKS);

    const logsRaw = await rpc("eth_getLogs", [
      {
        address: USDC_BASE,
        topics: [TRANSFER_TOPIC, null, paddedTo],
        fromBlock: "0x" + from.toString(16),
        toBlock: "latest",
      },
    ]);
    const logs = logsRaw as unknown as Log[];
    const want = BigInt(order.micro);
    const match = logs.find((l) => {
      try {
        return BigInt(l.data) === want;
      } catch {
        return false;
      }
    });
    if (!match) return { paid: false };

    await ctx.runMutation(internal.crypto.markPaidCrypto, {
      purchaseId: order.id,
      txHash: match.transactionHash,
    });
    return { paid: true };
  },
});
