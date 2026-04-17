import {
  getTodaysHabits,
  getCompletionRate,
  getOverdueTasks,
  getWeeklyTrend,
} from "@/lib/todoist";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.TODOIST_API_TOKEN) {
      return Response.json(
        {
          connected: false,
          habits: [],
          completionRate: 0,
          overdue: [],
          weekTrend: [],
        },
        { status: 200 },
      );
    }

    const [habits, completion, overdue, weekTrend] = await Promise.all([
      getTodaysHabits(),
      getCompletionRate(1),
      getOverdueTasks(),
      getWeeklyTrend(),
    ]);

    return Response.json({
      connected: true,
      habits,
      completionRate: completion.rate,
      completedCount: completion.completed,
      totalCount: completion.total,
      overdue,
      weekTrend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { connected: false, error: message, habits: [], weekTrend: [] },
      { status: 200 },
    );
  }
}
