/**
 * USDC-on-Base crypto rail — shared client/server helpers.
 * Base chain id 8453; USDC has 6 decimals.
 */
export const BASE_CHAIN_ID = 8453;
export const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

/** micro (6dp) → exact display string, e.g. 39000042 → "39.000042". */
export function microToUsdc(micro: number): string {
  const s = micro.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6)}`;
}

/** EIP-681 payment URI for an exact USDC transfer to `to`. */
export function eip681(to: string, micro: number): string {
  return `ethereum:${USDC_BASE_ADDRESS}@${BASE_CHAIN_ID}/transfer?address=${to}&uint256=${micro}`;
}

/** Current Base block number (read-only, public RPC, no key). */
export async function getBaseBlock(): Promise<number> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    cache: "no-store",
  });
  const j = (await res.json()) as { result?: string };
  if (!j.result) throw new Error("rpc_block_failed");
  return parseInt(j.result, 16);
}
