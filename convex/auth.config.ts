/**
 * Which issuers this deployment trusts for `ctx.auth`.
 *
 * Convex Auth signs its own tokens inside this deployment, so the issuer is the
 * deployment's own site URL. CONVEX_SITE_URL is injected by Convex — there is
 * no key to provision and no third party to be down, which is the whole reason
 * this replaced a hosted provider.
 *
 * Adding an external provider later means appending to this array, not
 * replacing it: Convex accepts a token from any listed issuer.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
