import { getBodyScore } from "@/lib/whoop";
import {
  fetchRecoveries,
  fetchSleep,
  fetchCycles,
  fetchWorkouts,
} from "@/lib/whoop";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.WHOOP_ACCESS_TOKEN) {
      return Response.json(
        {
          connected: false,
          bodyScore: null,
          recovery: null,
          sleep: null,
          strain: null,
          workouts: [],
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const start = dayStart.toISOString();
    const end = now.toISOString();

    const [bodyScore, recoveries, sleeps, cycles, workouts] = await Promise.all(
      [
        getBodyScore(),
        fetchRecoveries(start, end),
        fetchSleep(start, end),
        fetchCycles(start, end),
        fetchWorkouts(start, end),
      ],
    );

    return Response.json({
      connected: true,
      bodyScore,
      recovery: recoveries[0]?.score ?? null,
      sleep: sleeps[0]?.score ?? null,
      strain: cycles[0]?.score ?? null,
      workouts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { connected: false, error: message, bodyScore: null },
      { status: 200 },
    );
  }
}
