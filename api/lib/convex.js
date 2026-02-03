// api/lib/convex.js
const { ConvexClient } = require('convex/browser');

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL || 'https://hip-curlew-619.convex.cloud';

let convexClient = null;

function getConvexClient() {
  if (!convexClient) {
    convexClient = new ConvexClient(convexUrl);
  }
  return convexClient;
}

module.exports = { getConvexClient, convexUrl };
