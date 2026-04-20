import { askClaude, hasClaudeKey } from "@/lib/claude";
import type { Branch, BranchDimension } from "@/lib/protocol";
import { newId } from "@/lib/protocol";

export const dynamic = "force-dynamic";

interface DecomposeRequest {
  target: string;
  dimension?: BranchDimension;
  existingTitles?: string[];
}

interface ClaudeBranch {
  dimension: BranchDimension;
  title: string;
  rationale: string;
  habits: string[];
}

const SYSTEM = `You decompose a user self-improvement target into a goal tree.
Output ONLY JSON. Schema:
{"branches":[{"dimension":"sleep|nutrition|training|stress","title":"string","rationale":"string (<=120 chars)","habits":["string","string","string"]}]}
Rules: 4 branches (one per dimension). Each branch: 3-4 concrete daily habits. Habits are imperative, specific, under 60 chars. No filler. No emoji.`;

const SINGLE_SYSTEM = `You propose ONE fresh strategy (distinct from listed existing titles) for the given dimension toward the target.
Output ONLY JSON: {"title":"string","rationale":"string (<=120 chars)","habits":["string","string","string"]}
3-4 concrete daily habits, imperative, under 60 chars each.`;

function fallbackTree(target: string): Branch[] {
  const mk = (
    dimension: BranchDimension,
    title: string,
    rationale: string,
    habits: string[],
  ): Branch => ({
    id: newId("b_"),
    dimension,
    title,
    rationale,
    state: "active",
    habits: habits.map((label) => ({
      id: newId("h_"),
      label,
      cadence: "daily",
      status: "pending",
      streak: 0,
    })),
  });
  const lower = target.toLowerCase();
  const sleepFocus = /recover|sleep|hrv/.test(lower);
  return [
    mk(
      "sleep",
      sleepFocus ? "Protect 8h sleep window" : "Tighten sleep rhythm",
      "Sleep is the primary recovery lever.",
      [
        "Lights out by 22:30",
        "No screens 60m before bed",
        "Room temp 18-20C",
        "Consistent wake time",
      ],
    ),
    mk(
      "nutrition",
      "Stabilize fuel timing",
      "Blood sugar steadiness reduces HRV drag.",
      [
        "Protein-forward breakfast",
        "No food 3h before bed",
        "2.5L water logged",
        "Cut late caffeine",
      ],
    ),
    mk(
      "training",
      "Aerobic base, low strain",
      "Zone 2 work builds recovery capacity.",
      [
        "Zone 2 cardio 45m",
        "Mobility 10m",
        "Walk 8k steps",
        "Cap strain at 14",
      ],
    ),
    mk(
      "stress",
      "Down-regulate the nervous system",
      "Parasympathetic tone lifts HRV overnight.",
      [
        "Box breathing 4x4x4 10m",
        "Sunlight 15m AM",
        "Journal 5m evening",
        "No work after 21:00",
      ],
    ),
  ];
}

function parseBranches(raw: string): ClaudeBranch[] | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as {
      branches?: ClaudeBranch[];
    };
    return Array.isArray(obj.branches) ? obj.branches : null;
  } catch {
    return null;
  }
}

function parseSingle(raw: string): ClaudeBranch | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as ClaudeBranch;
  } catch {
    return null;
  }
}

function toBranch(c: ClaudeBranch): Branch {
  return {
    id: newId("b_"),
    dimension: c.dimension ?? "other",
    title: c.title?.slice(0, 80) ?? "Untitled branch",
    rationale: c.rationale?.slice(0, 160) ?? "",
    state: "active",
    habits: (Array.isArray(c.habits) ? c.habits : [])
      .slice(0, 5)
      .map((label) => ({
        id: newId("h_"),
        label: String(label).slice(0, 80),
        cadence: "daily" as const,
        status: "pending" as const,
        streak: 0,
      })),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DecomposeRequest;
    const target = (body.target ?? "").trim();
    if (!target) {
      return Response.json({ error: "target required" }, { status: 400 });
    }

    if (!hasClaudeKey()) {
      if (body.dimension) {
        const fb = fallbackTree(target).find(
          (b) => b.dimension === body.dimension,
        );
        return Response.json({ branch: fb ?? fallbackTree(target)[0] });
      }
      return Response.json({ branches: fallbackTree(target) });
    }

    if (body.dimension) {
      const user = `Target: ${target}
Dimension: ${body.dimension}
Existing titles (avoid overlap): ${(body.existingTitles ?? []).join(", ") || "none"}`;
      const raw = await askClaude(SINGLE_SYSTEM, user, { maxTokens: 512 });
      const parsed = parseSingle(raw);
      if (!parsed) {
        const fb = fallbackTree(target).find(
          (b) => b.dimension === body.dimension,
        );
        return Response.json({ branch: fb ?? fallbackTree(target)[0] });
      }
      parsed.dimension = body.dimension;
      return Response.json({ branch: toBranch(parsed) });
    }

    const raw = await askClaude(SYSTEM, `Target: ${target}`, {
      maxTokens: 1024,
    });
    const parsed = parseBranches(raw);
    if (!parsed || parsed.length === 0) {
      return Response.json({ branches: fallbackTree(target) });
    }
    return Response.json({ branches: parsed.map(toBranch) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 500 });
  }
}
