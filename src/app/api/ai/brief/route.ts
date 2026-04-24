import { askClaude, hasClaudeKey } from "@/lib/claude";
import {
  getTodaysHabits,
  getCompletionRate,
  getOverdueTasks,
  getWeeklyTrend,
  fetchCompletedTasks,
} from "@/lib/todoist";
import { buildCompletionMap, computeStreak } from "@/lib/streaks";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

const BRIEF_SYSTEM = `You are a pragmatic coach for a founder with ADHD who ships fast. Review the data and write a short morning brief (under 120 words):
- One opening line about today's energy/focus
- 2-3 specific priorities based on the data
- One pattern alert if anything stands out (overdue tasks, recurring skip, etc.)
No fluff. No motivational clichés. No emojis. Direct, punchy, literary.`;

function cacheKey(): string {
  const d = new Date();
  return `brief:${d.toISOString().split("T")[0]}`;
}

async function readCache(): Promise<{
  brief: string;
  generatedAt: string;
} | null> {
  try {
    const v = await kv.get<{ brief: string; generatedAt: string }>(cacheKey());
    return v ?? null;
  } catch {
    return null;
  }
}

async function writeCache(brief: string, generatedAt: string): Promise<void> {
  try {
    await kv.set(cacheKey(), { brief, generatedAt }, { ex: 7200 });
  } catch {
    // KV not configured; skip silently
  }
}

export async function GET(request: Request) {
  if (!hasClaudeKey()) {
    return Response.json(
      {
        brief: null,
        generatedAt: null,
        connected: false,
        error: "Connect Gemini API to enable AI features",
      },
      { status: 200 },
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  if (!force) {
    const cached = await readCache();
    if (cached) {
      return Response.json({ ...cached, connected: true, cached: true });
    }
  }

  if (!process.env.TODOIST_API_TOKEN) {
    return Response.json(
      {
        brief: null,
        generatedAt: null,
        connected: false,
        error: "Connect Todoist to enable AI features",
      },
      { status: 200 },
    );
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [habits, completion, overdue, weekTrend, completed] =
      await Promise.all([
        getTodaysHabits(),
        getCompletionRate(1),
        getOverdueTasks(),
        getWeeklyTrend(),
        fetchCompletedTasks(since.toISOString()),
      ]);

    const completionMap = buildCompletionMap(completed);
    const streak = computeStreak(completionMap, 2);

    const habitsList = habits
      .map((h) => `- ${h.content}${h.is_completed ? " [done]" : ""}`)
      .join("\n");
    const overdueList = overdue
      .slice(0, 8)
      .map((o) => `- ${o.content} (due ${o.due?.date})`)
      .join("\n");

    const userPrompt = `Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}

Today's habits (${habits.length}):
${habitsList || "none"}

Today's completion rate: ${completion.rate}%
Current streak: ${streak} days
Last 7 days completion counts: ${weekTrend.join(", ")}

Overdue tasks (${overdue.length}):
${overdueList || "none"}

Write the morning brief.`;

    const brief = await askClaude(BRIEF_SYSTEM, userPrompt, {
      model: "gemini-2.5-pro",
      maxTokens: 400,
    });

    const generatedAt = new Date().toISOString();
    await writeCache(brief, generatedAt);

    return Response.json({
      brief,
      generatedAt,
      connected: true,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json(
      { brief: null, generatedAt: null, connected: true, error: message },
      { status: 200 },
    );
  }
}
