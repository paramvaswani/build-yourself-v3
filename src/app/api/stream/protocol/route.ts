export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface StatePayload {
  done: number;
  pending: number;
  skipped: number;
  total: number;
  adherence: { sleep: number; training: number; nutrition: number };
  streak: number;
  nextAction: string | null;
}

function driftedState(seed: StatePayload, tick: number): StatePayload {
  const wobble = (v: number) =>
    Math.max(0, Math.min(100, v + Math.round(Math.sin(tick / 3) * 2)));
  return {
    ...seed,
    adherence: {
      sleep: wobble(seed.adherence.sleep),
      training: wobble(seed.adherence.training),
      nutrition: wobble(seed.adherence.nutrition),
    },
  };
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => ({}))) as Partial<StatePayload>;
  const seed: StatePayload = {
    done: body.done ?? 0,
    pending: body.pending ?? 0,
    skipped: body.skipped ?? 0,
    total: body.total ?? 0,
    adherence: {
      sleep: body.adherence?.sleep ?? 0,
      training: body.adherence?.training ?? 0,
      nutrition: body.adherence?.nutrition ?? 0,
    },
    streak: body.streak ?? 0,
    nextAction: body.nextAction ?? null,
  };

  const encoder = new TextEncoder();
  let tick = 0;
  let cancelled = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (cancelled) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("hello", { at: new Date().toISOString() });
      send("state", seed);

      const interval = setInterval(() => {
        tick++;
        const drifted = driftedState(seed, tick);
        send("heartbeat", { at: new Date().toISOString(), tick });
        send("state", drifted);
      }, 15000);

      request.signal.addEventListener("abort", () => {
        cancelled = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return Response.json({
    hint: "POST protocol state to subscribe. Emits 'state' every 15s.",
  });
}
