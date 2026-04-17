import { TodoistTask } from "./types";

const API_BASE = "https://api.todoist.com/api/v1";

function getToken(): string | null {
  return process.env.TODOIST_API_TOKEN || null;
}

interface TaskListResponse {
  results: TodoistTask[];
  next_cursor: string | null;
}

async function todoistFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("TODOIST_API_TOKEN not set");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Todoist API error: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function fetchActiveTasks(): Promise<TodoistTask[]> {
  const all: TodoistTask[] = [];
  let cursor: string | null = null;
  do {
    const qs: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const data: TaskListResponse = await todoistFetch<TaskListResponse>(
      `/tasks${qs}`,
    );
    all.push(...(data.results || []));
    cursor = data.next_cursor;
  } while (cursor);
  return all;
}

interface CompletedResponse {
  items: TodoistTask[];
  next_cursor: string | null;
}

export async function fetchCompletedTasks(
  since: string,
): Promise<TodoistTask[]> {
  const sinceIso = since.includes("T") ? since : `${since}T00:00:00Z`;
  const until = new Date().toISOString();
  try {
    const data = await todoistFetch<CompletedResponse>(
      `/tasks/completed/by_completion_date?since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(until)}`,
    );
    return data.items || [];
  } catch {
    return [];
  }
}

export async function getRecurringHabits(): Promise<TodoistTask[]> {
  const tasks = await fetchActiveTasks();
  return tasks.filter((t) => t.due?.is_recurring);
}

export async function getOverdueTasks(): Promise<TodoistTask[]> {
  const tasks = await fetchActiveTasks();
  const now = new Date().toISOString().split("T")[0];
  return tasks.filter((t) => t.due && t.due.date < now);
}

export async function getTodaysTasks(): Promise<TodoistTask[]> {
  const tasks = await fetchActiveTasks();
  const today = new Date().toISOString().split("T")[0];
  return tasks.filter((t) => t.due && t.due.date.startsWith(today));
}

export async function getTodaysHabits(): Promise<TodoistTask[]> {
  const tasks = await fetchActiveTasks();
  const today = new Date().toISOString().split("T")[0];
  return tasks.filter(
    (t) => t.due?.is_recurring && t.due.date <= `${today}T23:59:59`,
  );
}

export async function getCompletionRate(
  days: number,
): Promise<{ rate: number; completed: number; total: number }> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  try {
    const completed = await fetchCompletedTasks(sinceStr);
    const active = await fetchActiveTasks();
    const recurring = active.filter((t) => t.due?.is_recurring);
    const expectedPerDay = recurring.length;
    const expectedTotal = expectedPerDay * days;
    const completedCount = completed.length;

    return {
      rate:
        expectedTotal > 0
          ? Math.min(100, Math.round((completedCount / expectedTotal) * 100))
          : 0,
      completed: completedCount,
      total: expectedTotal,
    };
  } catch {
    return { rate: 0, completed: 0, total: 0 };
  }
}

export async function getWeeklyTrend(): Promise<number[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  let completed: TodoistTask[] = [];
  try {
    completed = await fetchCompletedTasks(since.toISOString());
  } catch {
    return [0, 0, 0, 0, 0, 0, 0];
  }

  const trend: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayCompleted = completed.filter((t) => {
      if (!t.completed_at) return false;
      const d = new Date(t.completed_at);
      return d >= dayStart && d <= dayEnd;
    });
    trend.push(dayCompleted.length);
  }
  return trend;
}
