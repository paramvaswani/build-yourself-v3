import { redirect } from "next/navigation";
import { kvSet } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId) {
    return Response.json({ error: "WHOOP_CLIENT_ID not set" }, { status: 500 });
  }

  const state = crypto.randomUUID();
  await kvSet(`whoop:state:${state}`, { createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/whoop/callback`,
    response_type: "code",
    scope:
      "read:sleep read:recovery read:cycles read:workout read:profile read:body_measurement offline",
    state,
  });

  redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`);
}
