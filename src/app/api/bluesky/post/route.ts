import { blueskyConfigured, postSkeet } from "@/lib/bluesky";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!blueskyConfigured()) {
    return Response.json(
      { success: false, error: "Bluesky not configured" },
      { status: 200 },
    );
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return Response.json(
      { success: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json(
      { success: false, error: "text required" },
      { status: 400 },
    );
  }

  try {
    const { uri } = await postSkeet(text);
    return Response.json({ success: true, uri });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ success: false, error: message }, { status: 200 });
  }
}
