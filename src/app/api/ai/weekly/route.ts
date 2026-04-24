import { askClaude, hasClaudeKey } from "@/lib/claude";
import {
  fetchCompletedTasks,
  getWeeklyTrend,
  getCompletionRate,
} from "@/lib/todoist";
import { kvGet, kvSet } from "@/lib/kv";

export const dynamic = "force-dynamic";

interface WeeklyReport {
  summary: string;
  bestDay: string;
  worstDay: string;
  pattern: string;
  recommendation: string;
  week: string;
  generatedAt: string;
}

const WEEKLY_SYSTEM = `You are a pragmatic coach analyzing a founder's week. Review the data and produce a concise weekly synthesis in strict JSON:
{
  "summary": "2-3 sentences on the overall week",
  "bestDay": "which day (e.g. Tuesday) + brief why",
  "worstDay": "which day + brief why",
  "pattern": "the single most useful pattern you observe",
  "recommendation": "one concrete action for next week"
}
Direct, literary, no clichés, no emojis. Ground claims in the numbers. Return ONLY valid JSON, no markdown fences.`;

function weekKey(): string {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - 6);
  return `weekly:${start.toISOString().split("T")[0]}:${d.toISOString().split("T")[0]}`;
}

function weekRange(): string {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - 6);
  return `${start.toISOString().split("T")[0]} to ${d.toISOString().split("T")[0]}`;
}

function parseReport(raw: string): Omit<WeeklyReport, "week" | "generatedAt"> {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  try {
    const parsed = JSON.parse(text) as Record<string, string>;
    return {
      summary: parsed.summary || "",
      bestDay: parsed.bestDay || "",
      worstDay: parsed.worstDay || "",
      pattern: parsed.pattern || "",
      recommendation: parsed.recommendation || "",
    };
  } catch {
    return {
      summary: text.slice(0, 400),
      bestDay: "",
      worstDay: "",
      pattern: "",
      recommendation: "",
    };
  }
}

export async function GET(request: Request) {
  if (!hasClaudeKey()) {
    return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 200 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const key = weekKey();
  if (!force) {
    const cached = await kvGet<WeeklyReport>(key);
    if (cached) return Response.json({ ...cached, cached: true });
  }

  if (!process.env.TODOIST_API_TOKEN) {
    return Response.json(
      {
        error: "Connect Todoist to enable weekly synthesis",
      },
      { status: 200 },
    );
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [completed, weekTrend, rate] = await Promise.all([
      fetchCompletedTasks(since.toISOString()),
      getWeeklyTrend(),
      getCompletionRate(7),
    ]);

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayCounts = weekTrend
      .map((n, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return `${days[d.getDay()]} ${d.toISOString().split("T")[0]}: ${n} tasks`;
      })
      .join("\n");

    const recentTitles = completed
      .slice(0, 40)
      .map((t) => `- ${t.content}`)
      .join("\n");

    const userPrompt = `Week range: ${weekRange()}
Daily completion counts:
${dayCounts}

7-day completion rate: ${rate.rate}% (${rate.completed}/${rate.total} expected)

Recent completed items (sample):
${recentTitles || "(none)"}

Produce the weekly synthesis as JSON.`;

    const raw = await askClaude(WEEKLY_SYSTEM, userPrompt, {
      model: "gemini-2.5-pro",
      maxTokens: 800,
    });
    const parsed = parseReport(raw);

    const report: WeeklyReport = {
      ...parsed,
      week: weekRange(),
      generatedAt: new Date().toISOString(),
    };

    await kvSet(key, report);

    return Response.json({ ...report, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 200 });
  }
}
