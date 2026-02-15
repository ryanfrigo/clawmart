import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const eventType = payload.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = payload.data;
    await convex.mutation(api.users.create, {
      clerkId: id,
      email: email_addresses?.[0]?.email_address ?? "",
      name: [first_name, last_name].filter(Boolean).join(" ") || undefined,
      imageUrl: image_url || undefined,
    });
  }

  return NextResponse.json({ received: true });
}
