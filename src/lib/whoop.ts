import { WhoopCycle, WhoopSleep, WhoopRecovery, WhoopWorkout } from "./types";
import { kvGet, kvSet } from "./kv";

const API_BASE = "https://api.prod.whoop.com/developer/v1";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const KV_KEY = "whoop:tokens";

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function getTokens(): Promise<WhoopTokens | null> {
  const fromKv = await kvGet<WhoopTokens>(KV_KEY);
  if (fromKv) return fromKv;
  const envToken = process.env.WHOOP_ACCESS_TOKEN;
  if (envToken) {
    return {
      access_token: envToken,
      refresh_token: "",
      expires_at: Date.now() + 3600_000,
    };
  }
  return null;
}

async function saveTokens(tokens: WhoopTokens): Promise<void> {
  await kvSet(KV_KEY, tokens);
}

async function refreshTokens(
  refreshToken: string,
): Promise<WhoopTokens | null> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: "offline",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const tokens: WhoopTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function isConnected(): Promise<boolean> {
  const tokens = await getTokens();
  return Boolean(tokens?.access_token);
}

async function whoopFetch<T>(path: string): Promise<T> {
  let tokens = await getTokens();
  if (!tokens?.access_token) throw new Error("Whoop not connected");

  let res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 && tokens.refresh_token) {
    const refreshed = await refreshTokens(tokens.refresh_token);
    if (refreshed) {
      tokens = refreshed;
      res = await fetch(`${API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
      });
    }
  }

  if (!res.ok) {
    throw new Error(`Whoop API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<WhoopTokens | null> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const tokens: WhoopTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function fetchCycles(
  start: string,
  end: string,
): Promise<WhoopCycle[]> {
  const data = await whoopFetch<{ records: WhoopCycle[] }>(
    `/cycle?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return data.records || [];
}

export async function fetchSleep(
  start: string,
  end: string,
): Promise<WhoopSleep[]> {
  const data = await whoopFetch<{ records: WhoopSleep[] }>(
    `/activity/sleep?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return data.records || [];
}

export async function fetchRecoveries(
  start: string,
  end: string,
): Promise<WhoopRecovery[]> {
  const data = await whoopFetch<{ records: WhoopRecovery[] }>(
    `/recovery?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return data.records || [];
}

export async function fetchWorkouts(
  start: string,
  end: string,
): Promise<WhoopWorkout[]> {
  const data = await whoopFetch<{ records: WhoopWorkout[] }>(
    `/activity/workout?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
  return data.records || [];
}

export async function getBodyScore(): Promise<number | null> {
  try {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [recoveries, sleeps, cycles] = await Promise.all([
      fetchRecoveries(dayStart.toISOString(), now.toISOString()),
      fetchSleep(dayStart.toISOString(), now.toISOString()),
      fetchCycles(dayStart.toISOString(), now.toISOString()),
    ]);

    let score = 0;
    let components = 0;

    if (recoveries.length > 0 && recoveries[0].score) {
      score += recoveries[0].score.recovery_score;
      components++;
    }

    if (sleeps.length > 0 && sleeps[0].score) {
      score += sleeps[0].score.sleep_performance_percentage;
      components++;
    }

    if (cycles.length > 0 && cycles[0].score) {
      const strain = cycles[0].score.strain;
      const strainScore = Math.min(100, (strain / 21) * 100);
      score += strainScore;
      components++;
    }

    if (components === 0) return null;
    return Math.round(score / components);
  } catch {
    return null;
  }
}
