import Anthropic from "@anthropic-ai/sdk";
import { hasClaudeKey } from "@/lib/claude";
import { getTodaysHabits, getCompletionRate } from "@/lib/todoist";
import { computeAllScores } from "@/lib/scores";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a pragmatic coach for a solo founder with ADHD who ships fast. You have access to their real-time data: today's habits, completion rate, and dimension scores. Be direct. No fluff. No motivational clichés. No emojis. Short, punchy, useful. If the user asks something you can answer from the data, use it. If they want perspective, give it — literary, honest, contrarian when warranted.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  if (!hasClaudeKey()) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = (await request.json()) as { messages?: ChatMessage[] };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!messages.length) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  let context = "";
  try {
    const [snapshot, habits, completion] = await Promise.all([
      computeAllScores(),
      process.env.TODOIST_API_TOKEN ? getTodaysHabits() : Promise.resolve([]),
      process.env.TODOIST_API_TOKEN
        ? getCompletionRate(1)
        : Promise.resolve({ rate: 0, completed: 0, total: 0 }),
    ]);

    const scoreLines = Object.values(snapshot.scores)
      .map(
        (s) =>
          `  ${s.dimension}: ${s.score ?? "--"}${s.source ? ` (via ${s.source})` : ""}`,
      )
      .join("\n");
    const habitLines = habits
      .map((h) => `  - ${h.content}${h.is_completed ? " [done]" : ""}`)
      .join("\n");

    context = `[User's current data — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}]
Overall score: ${snapshot.overall ?? "--"}
Dimension scores:
${scoreLines}
Today's habits (${habits.length}):
${habitLines || "  (none)"}
Today's completion rate: ${completion.rate}%
`;
  } catch {
    context = "[Data context unavailable]";
  }

  const system = `${SYSTEM_PROMPT}\n\n${context}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const content =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}
