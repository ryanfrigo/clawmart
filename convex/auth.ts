/**
 * Convex Auth — email + password, run inside this deployment.
 *
 * Why Password and nothing else: it is the only provider that works end to end
 * with credentials we already control. OAuth needs an app registered with a
 * third party and two secrets that do not exist yet, and we do not ship a
 * provider we cannot test.
 *
 * ADDING GITHUB (or Google, or any Auth.js provider) LATER IS ONE LINE + TWO
 * ENV VARS — the shape below is deliberately kept ready for it:
 *
 *   import GitHub from "@auth/core/providers/github";
 *   convexAuth({ providers: [passwordProvider, GitHub] })
 *
 *   npx convex env set AUTH_GITHUB_ID     <client id>
 *   npx convex env set AUTH_GITHUB_SECRET <client secret>
 *   npx convex env set SITE_URL           https://clawmart.co
 *
 * `auth.addHttpRoutes(http)` (convex/http.ts) already serves the
 * /api/auth/signin/* and /api/auth/callback/* routes an OAuth provider needs,
 * and the sign-in page only gains a button that calls signIn("github").
 *
 * DEPLOYMENT ENV REQUIRED FOR SIGN-IN TO WORK AT ALL:
 *   JWT_PRIVATE_KEY, JWKS — this deployment's own signing keypair, generated
 *   by `npx @convex-dev/auth`. CONVEX_SITE_URL is supplied by Convex itself
 *   and is what convex/auth.config.ts trusts as the issuer.
 *
 * OWNERSHIP, LOAD-BEARING: Convex Auth mints the JWT `sub` claim as
 * "<userId>|<sessionId>" (node_modules/@convex-dev/auth/src/server/
 * implementation/tokens.ts). `ctx.auth.getUserIdentity().subject` therefore
 * CHANGES ON EVERY NEW SESSION and must never be stored as an owner key.
 * Server code uses `getAuthUserId(ctx)`, which returns the durable
 * `Id<"users">` — see the requireIdentity helpers in companies/missions/boxes.
 */
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

/** Mirrored by the sign-in form so the common case never round-trips. */
export const PASSWORD_MIN = 8;

// Deliberately loose: one @, no whitespace, a dot in the host. Anything
// stricter rejects real addresses, and delivery is the real validator.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * ConvexError (not Error) so the code survives the wire: Convex strips the
 * message of a plain Error in production, and the sign-in form needs to tell
 * "that password is too short" apart from "something broke".
 */
const passwordProvider = Password<DataModel>({
  profile(params) {
    const email = String(params.email ?? "")
      .trim()
      .toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ConvexError("invalid_email");
    return { email };
  },
  validatePasswordRequirements(password) {
    if (password.length < PASSWORD_MIN) throw new ConvexError("weak_password");
  },
});

/**
 * SECURITY — why signUp is guarded rather than passed straight through.
 *
 * Convex Auth's signUp flow reaches createAccountFromCredentials, which does
 * this when the email already has an account (node_modules/@convex-dev/auth/
 * dist/server/implementation/mutations/createAccountFromCredentials.js:27):
 *
 *     if (existingAccount !== null) {
 *       if (!(await Provider.verify(provider, account.secret, existing)))
 *         throw new Error(`Account ${account.id} already exists`);
 *       return { account: existingAccount, user: ... };   // <-- signs you IN
 *     }
 *
 * So "signing up" with someone else's email is a password oracle: a wrong guess
 * says "already exists", and a RIGHT guess returns the victim's account and
 * mints a session for the caller. That file imports no rate limiter — the
 * failed-attempt lockout lives only on the signIn path (retrieveAccount) — so
 * the guessing is unmetered. That is account takeover, not a nitpick.
 *
 * The provider's own `profile` callback cannot fix it: Password.authorize calls
 * it WITHOUT awaiting (`config.profile?.(params, ctx) ?? ...`), so it must stay
 * synchronous and cannot look in the database.
 *
 * So we wrap `authorize` and refuse a signUp for an address that already
 * exists — before any secret is verified, with a response that does not depend
 * on the password. Hashing, signIn and reset stay the library's, untouched.
 *
 * Residual, accepted: "email_taken" still reveals that an address is
 * registered. Every signup form that refuses duplicates does, and the limits
 * below bound how fast a list can be tested. What is closed is the part that
 * mattered — a correct guess no longer grants a session.
 */
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const MAX_SIGNUPS_PER_EMAIL_PER_HOUR = 5;
const MAX_SIGNUPS_GLOBAL_PER_HOUR = 200;

const baseAuthorize = passwordProvider.authorize;

const guardedPassword = {
  ...passwordProvider,
  // Signature derived from the wrapped function rather than restated, so this
  // wrapper cannot drift from the library's own contract on upgrade.
  authorize: async (
    params: Parameters<typeof baseAuthorize>[0],
    ctx: Parameters<typeof baseAuthorize>[1]
  ) => {
    if (params.flow === "signUp") {
      const email = String(params.email ?? "")
        .trim()
        .toLowerCase();
      if (!EMAIL_RE.test(email)) throw new ConvexError("invalid_email");
      await ctx.runMutation(internal.auth.guardSignUp, { email });
    }
    return baseAuthorize(params, ctx);
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [guardedPassword],
});

/**
 * Rate-limit the attempt and refuse a duplicate address. One mutation, so the
 * check and the increment share a transaction — split across two calls, a burst
 * could interleave and slip through.
 */
export const guardSignUp = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<null> => {
    await bumpRateLimit(
      ctx,
      `signup:${args.email}`,
      SIGNUP_WINDOW_MS,
      MAX_SIGNUPS_PER_EMAIL_PER_HOUR
    );
    await bumpRateLimit(ctx, "signup:global", SIGNUP_WINDOW_MS, MAX_SIGNUPS_GLOBAL_PER_HOUR);

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (existing !== null) throw new ConvexError("email_taken");
    return null;
  },
});

/** Same sliding window as companies/missions/boxes (kept local — surgical). */
async function bumpRateLimit(
  ctx: MutationCtx,
  key: string,
  windowMs: number,
  max: number
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing || now - existing.windowStart > windowMs) {
    if (existing) await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
  } else if (existing.count >= max) {
    throw new ConvexError("rate_limited");
  } else {
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  }
}

/**
 * The signed-in operator, for the nav chip. Returns null (never throws) when
 * signed out, so the nav can render its anonymous state without a try/catch.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (user === null) return null;
    return { id: userId, email: user.email ?? null };
  },
});
