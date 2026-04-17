import { notionConfigured, pushToJournal } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!notionConfigured()) {
    return Response.json(
      {
        success: false,
        error: "Set NOTION_TOKEN and NOTION_JOURNAL_PAGE_ID env vars",
      },
      { status: 200 },
    );
  }

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return Response.json(
      { success: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const content = (body.content ?? "").trim();
  if (!content) {
    return Response.json(
      { success: false, error: "content required" },
      { status: 400 },
    );
  }

  try {
    const { url } = await pushToJournal(content);
    return Response.json({ success: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ success: false, error: message }, { status: 200 });
  }
}
