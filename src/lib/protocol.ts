import type { Commitment } from "@/components/CommitmentCard";

export type BranchDimension =
  | "sleep"
  | "nutrition"
  | "training"
  | "stress"
  | "other";

export type NodeState = "active" | "paused";

export interface Habit {
  id: string;
  label: string;
  cadence: "daily" | "weekly";
  status: "pending" | "done" | "skipped";
  streak: number;
  lastMark?: string;
}

export interface Branch {
  id: string;
  dimension: BranchDimension;
  title: string;
  rationale: string;
  state: NodeState;
  habits: Habit[];
  forkOf?: string;
}

export interface ProtocolTree {
  id: string;
  target: string;
  createdAt: string;
  branches: Branch[];
}

export type MutationKind =
  | "create"
  | "redecompose"
  | "fork"
  | "toggleState"
  | "habitMark"
  | "importCommitment";

export interface Mutation {
  kind: MutationKind;
  at: string;
  snapshot: ProtocolTree;
}

export interface ProtocolStore {
  tree: ProtocolTree | null;
  history: Mutation[];
}

export const PROTOCOL_KEY = "protocol-tree-v1";
export const MAX_HISTORY = 10;

export function newId(prefix = ""): string {
  return (
    prefix +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function emptyStore(): ProtocolStore {
  return { tree: null, history: [] };
}

export function loadStore(): ProtocolStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(PROTOCOL_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as ProtocolStore;
    return {
      tree: parsed.tree ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: ProtocolStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROTOCOL_KEY, JSON.stringify(store));
  } catch {
    /* storage full — ignore */
  }
}

export function pushMutation(
  store: ProtocolStore,
  kind: MutationKind,
  next: ProtocolTree,
): ProtocolStore {
  const snapshot = store.tree ? cloneTree(store.tree) : null;
  const history = [
    ...(snapshot ? [{ kind, at: new Date().toISOString(), snapshot }] : []),
    ...store.history,
  ].slice(0, MAX_HISTORY);
  return { tree: next, history };
}

export function undo(store: ProtocolStore): ProtocolStore {
  if (store.history.length === 0 || !store.tree) return store;
  const [last, ...rest] = store.history;
  return { tree: cloneTree(last.snapshot), history: rest };
}

export function cloneTree(tree: ProtocolTree): ProtocolTree {
  return JSON.parse(JSON.stringify(tree)) as ProtocolTree;
}

export function importFromCommitments(commitments: Commitment[]): Branch[] {
  return commitments
    .filter((c) => c.status === "active")
    .slice(0, 4)
    .map<Branch>((c) => ({
      id: newId("b_"),
      dimension: "other",
      title: c.description,
      rationale: "Imported from active commitment.",
      state: "active",
      habits: [
        {
          id: newId("h_"),
          label: `Log progress toward ${c.target} ${c.metric.replace(/_/g, " ")}`,
          cadence: "daily",
          status: "pending",
          streak: 0,
        },
      ],
    }));
}

export function todaysHabitStatus(tree: ProtocolTree | null): {
  done: number;
  pending: number;
  skipped: number;
  total: number;
} {
  if (!tree) return { done: 0, pending: 0, skipped: 0, total: 0 };
  let done = 0;
  let pending = 0;
  let skipped = 0;
  for (const b of tree.branches) {
    if (b.state !== "active") continue;
    for (const h of b.habits) {
      if (h.cadence !== "daily") continue;
      if (h.status === "done") done++;
      else if (h.status === "skipped") skipped++;
      else pending++;
    }
  }
  return { done, pending, skipped, total: done + pending + skipped };
}

export function adherenceByDimension(
  tree: ProtocolTree | null,
): Record<"sleep" | "training" | "nutrition", number> {
  const buckets = { sleep: [0, 0], training: [0, 0], nutrition: [0, 0] };
  if (!tree) return { sleep: 0, training: 0, nutrition: 0 };
  for (const b of tree.branches) {
    if (b.state !== "active") continue;
    const key =
      b.dimension === "sleep" ||
      b.dimension === "training" ||
      b.dimension === "nutrition"
        ? b.dimension
        : null;
    if (!key) continue;
    for (const h of b.habits) {
      if (h.cadence !== "daily") continue;
      buckets[key][1]++;
      if (h.status === "done") buckets[key][0]++;
    }
  }
  const ratio = (pair: [number, number]) =>
    pair[1] === 0 ? 0 : Math.round((pair[0] / pair[1]) * 100);
  return {
    sleep: ratio(buckets.sleep as [number, number]),
    training: ratio(buckets.training as [number, number]),
    nutrition: ratio(buckets.nutrition as [number, number]),
  };
}
