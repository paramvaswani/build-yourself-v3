export const dynamic = "force-dynamic";

interface MarkRequest {
  habitId: string;
  status: "done" | "pending" | "skipped";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarkRequest;
    if (!body.habitId || !body.status) {
      return Response.json(
        { success: false, error: "habitId and status required" },
        { status: 400 },
      );
    }
    // Server confirms the mark. In a future revision this writes to KV / Notion.
    // For now it validates and echoes back so the client can reconcile.
    return Response.json({
      success: true,
      habitId: body.habitId,
      status: body.status,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
