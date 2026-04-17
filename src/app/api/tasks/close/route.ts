export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = process.env.TODOIST_API_TOKEN;
    if (!token) {
      return Response.json(
        { success: false, error: "TODOIST_API_TOKEN not set" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { taskId?: string };
    if (!body.taskId) {
      return Response.json(
        { success: false, error: "taskId required" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `https://api.todoist.com/api/v1/tasks/${encodeURIComponent(body.taskId)}/close`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json(
        {
          success: false,
          error: `Todoist ${res.status}: ${text.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
