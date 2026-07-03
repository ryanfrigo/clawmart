/**
 * Clerk -> Convex auth. CLERK_JWT_ISSUER_DOMAIN is set in Convex env (the
 * Clerk Frontend API URL, e.g. https://xxx.clerk.accounts.dev); the matching
 * "convex" JWT template lives in the Clerk instance.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
