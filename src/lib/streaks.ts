function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function computeStreak(
  completedByDay: Map<string, number>,
  minPerDay: number,
): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    const count = completedByDay.get(key) ?? 0;

    if (count >= minPerDay) {
      streak++;
    } else if (i === 0) {
      // Grace period: today not counted against streak if 0
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export function buildCompletionMap(
  completedTasks: Array<{ completed_at?: string | null }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of completedTasks) {
    if (!t.completed_at) continue;
    const key = t.completed_at.split("T")[0];
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
