import { computeAllScores } from "@/lib/scores";
import {
  getTodaysHabits,
  getCompletionRate,
  getWeeklyTrend,
} from "@/lib/todoist";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await computeAllScores();

    let habits: DashboardData["habits"] = { tasks: [], completionRate: 0 };
    let stats: DashboardData["stats"] = {
      streakDays: 0,
      todayCompletion: 0,
      weekTrend: [],
    };

    if (process.env.TODOIST_API_TOKEN) {
      try {
        const [todayHabits, completion, weekTrend] = await Promise.all([
          getTodaysHabits(),
          getCompletionRate(1),
          getWeeklyTrend(),
        ]);

        habits = {
          tasks: todayHabits,
          completionRate: completion.rate,
        };

        let streak = 0;
        for (let i = weekTrend.length - 1; i >= 0; i--) {
          if (weekTrend[i] > 0) streak++;
          else break;
        }

        stats = {
          streakDays: streak,
          todayCompletion: completion.rate,
          weekTrend,
        };
      } catch {
        // Todoist unavailable, continue with defaults
      }
    }

    const heatmap: DashboardData["heatmap"] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = i === 0;
      heatmap.push({
        date: dateStr,
        value: isToday && snapshot.overall !== null ? snapshot.overall : 0,
      });
    }

    const data: DashboardData = {
      snapshot,
      habits,
      stats,
      heatmap,
    };

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
