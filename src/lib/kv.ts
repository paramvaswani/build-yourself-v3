import { kv } from "@vercel/kv";

const memory = new Map<string, unknown>();

function kvEnabled(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!kvEnabled()) {
    return (memory.get(key) as T | undefined) ?? null;
  }
  try {
    return (await kv.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (!kvEnabled()) {
    memory.set(key, value);
    return;
  }
  try {
    await kv.set(key, value);
  } catch {
    memory.set(key, value);
  }
}

export async function kvDelete(key: string): Promise<void> {
  if (!kvEnabled()) {
    memory.delete(key);
    return;
  }
  try {
    await kv.del(key);
  } catch {
    memory.delete(key);
  }
}
