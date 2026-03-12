import { ConvexHttpClient } from "convex/browser"

let convexClient: ConvexHttpClient | null = null

export function getConvexClient() {
  if (!convexClient) {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined")
    }
    convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  }
  return convexClient
}