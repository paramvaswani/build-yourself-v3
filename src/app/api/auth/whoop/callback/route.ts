import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    redirect(`/?error=${encodeURIComponent(error || "missing_code")}`);
  }

  const redirectUri = `${appUrl}/api/auth/whoop/callback`;
  const tokens = await exchangeCodeForTokens(code, redirectUri);

  if (!tokens) {
    redirect(`/?error=whoop_token_exchange_failed`);
  }

  redirect(`/?connected=whoop`);
}
