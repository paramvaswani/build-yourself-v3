import { Client } from "@notionhq/client";

export function notionConfigured(): boolean {
  return !!(process.env.NOTION_TOKEN && process.env.NOTION_JOURNAL_PAGE_ID);
}

export async function pushToJournal(content: string): Promise<{ url: string }> {
  const token = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_JOURNAL_PAGE_ID;
  if (!token || !pageId) {
    throw new Error("NOTION_TOKEN and NOTION_JOURNAL_PAGE_ID must be set");
  }

  const notion = new Client({ auth: token });
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const chunks: string[] = [];
  const MAX = 1900;
  let rest = content;
  while (rest.length > MAX) {
    let cut = rest.lastIndexOf("\n", MAX);
    if (cut < MAX / 2) cut = MAX;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest.length) chunks.push(rest);

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: today } }],
        },
      },
      ...chunks.map((chunk) => ({
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: {
          rich_text: [{ type: "text" as const, text: { content: chunk } }],
        },
      })),
      {
        object: "block",
        type: "divider",
        divider: {},
      },
    ],
  });

  const url = `https://www.notion.so/${pageId.replace(/-/g, "")}`;
  return { url };
}
