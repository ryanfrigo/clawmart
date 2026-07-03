/**
 * Clerk -> Convex auth. CLERK_JWT_ISSUER_DOMAIN is set in Convex env (the
 * Clerk Frontend API URL, e.g. https://xxx.clerk.accounts.dev); the matching
 * "convex" JWT template lives in the Clerk instance.
 */
const authConfig = {
  // A deployment without the Clerk env var still pushes cleanly — the guest
  // packs/checkout backend must never depend on Studio auth being configured.
  providers: process.env.CLERK_JWT_ISSUER_DOMAIN
    ? [
        {
          domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
          applicationID: "convex",
        },
      ]
    : [],
};

export default authConfig;
