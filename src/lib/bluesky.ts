import { AtpAgent } from "@atproto/api";

export function blueskyConfigured(): boolean {
  return !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD);
}

export async function postSkeet(text: string): Promise<{ uri: string }> {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) {
    throw new Error("BLUESKY_HANDLE and BLUESKY_APP_PASSWORD must be set");
  }

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });
  const res = await agent.post({
    text,
    createdAt: new Date().toISOString(),
  });
  return { uri: res.uri };
}
