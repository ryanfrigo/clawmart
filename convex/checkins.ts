/**
 * Daily CEO check-in — the "your company keeps working" loop (crons.ts, daily).
 *
 * Architecture mirrors the build pipeline: the cron kickoff only READS a
 * bounded id list and SCHEDULES one action per company (one model call each,
 * far under Convex's action ceiling), then schedules the digest pass. Emails
 * are env-gated on RESEND_API_KEY — without it the in-app feed still works —
 * at most one digest per owner per day (claimDigestSend), with every
 * model/user string HTML-escaped before it touches the email body.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { callOpenRouter } from "./agents";
import {
  WORKER_MODEL,
  ceoCheckinMessages,
  escapeHtml,
  extractJson,
} from "./lib/agents";

// Stagger per-company actions to be polite to OpenRouter; run the digest
// comfortably after the last check-in should have finished.
const STAGGER_MS = 2_000;
const DIGEST_LAG_MS = 120_000;

export const dailyCheckins = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const due = await ctx.runQuery(internal.companies.dueCheckins, {});
    for (let i = 0; i < due.length; i++) {
      await ctx.scheduler.runAfter(i * STAGGER_MS, internal.checkins.runCompanyCheckin, {
        companyId: due[i],
      });
    }
    await ctx.scheduler.runAfter(
      due.length * STAGGER_MS + DIGEST_LAG_MS,
      internal.checkins.sendDigests,
      {}
    );
    console.log(`checkins_scheduled count=${due.length}`);
    return null;
  },
});

/** One company, one model call — its own action, its own failure domain. */
export const runCompanyCheckin = internalAction({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args): Promise<null> => {
    // Re-checks due-ness, so overlapping/manual runs mostly no-op here
    // before spending a model call; recordCheckin is the atomic guard.
    const stats = await ctx.runQuery(internal.companies.companyCheckinStats, {
      companyId: args.companyId,
    });
    if (!stats) return null;
    try {
      const result = await callOpenRouter(
        WORKER_MODEL,
        ceoCheckinMessages(stats),
        500,
        30_000
      );
      const parsed = extractJson(result.text);
      const note = typeof parsed.note === "string" ? parsed.note.trim() : "";
      const focus =
        typeof parsed.focus === "string" ? parsed.focus.trim() : "Today";
      if (!note) {
        console.log(`checkin_unusable_output company=${stats.slug}`);
        return null;
      }
      await ctx.runMutation(internal.companies.recordCheckin, {
        companyId: args.companyId,
        focus,
        note,
      });
    } catch (err) {
      console.log(
        `checkin_failed company=${stats.slug}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`
      );
    }
    return null;
  },
});

/** Morning digest: one email per owner covering their freshly checked-in companies. */
export const sendDigests = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null; // email is opt-in; the in-app feed is primary

    const rows = await ctx.runQuery(internal.companies.digestRows, {});
    const byOwner = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byOwner.get(row.ownerEmail) ?? [];
      list.push(row);
      byOwner.set(row.ownerEmail, list);
    }

    const appUrl = (process.env.APP_URL ?? "https://clawmart.co").replace(/\/$/, "");
    for (const [email, companies] of byOwner) {
      const claim = await ctx.runMutation(internal.companies.claimDigestSend, {
        email,
      });
      if (!claim.ok) continue; // this owner already got today's digest

      const sections = companies
        .map(
          (r) =>
            `<h3 style="margin:20px 0 4px">${escapeHtml(r.name)}</h3>` +
            `<p style="margin:0;color:#555">${r.newSignups} new on the waitlist in the last 24h (${r.totalSignups} total).</p>` +
            `<p style="margin:8px 0 0">${escapeHtml(r.note)}</p>` +
            `<p style="margin:8px 0 0"><a href="${appUrl}/c/${encodeURIComponent(r.slug)}">Public page</a></p>`
        )
        .join("");
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: "Clawmart Studio <studio@clawmart.co>",
            to: [email],
            subject: "Your companies this morning",
            html:
              `<p>Morning check-in from your founding team:</p>` +
              sections +
              `<p style="margin-top:24px;color:#888;font-size:12px">AI-generated check-in on your Clawmart Studio concept companies — drafts and suggestions, not advice or guarantees. You get this because you built these companies; to stop the daily email, delete the company or email support@clawmart.co and we'll turn it off.</p>`,
          }),
        });
        if (!res.ok) console.log(`checkin_email_failed status=${res.status}`);
      } catch {
        console.log("checkin_email_failed network");
      }
    }
    return null;
  },
});
