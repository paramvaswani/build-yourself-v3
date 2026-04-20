"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  GitFork,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  type Branch,
  type BranchDimension,
  type Habit,
  type ProtocolStore,
  type ProtocolTree,
  adherenceByDimension,
  cloneTree,
  importFromCommitments,
  loadStore,
  newId,
  pushMutation,
  saveStore,
  todaysHabitStatus,
  undo as undoStore,
} from "@/lib/protocol";
import { ProtocolRings } from "@/components/ProtocolRings";
import type { Commitment } from "@/components/CommitmentCard";

const DIMENSION_ORDER: BranchDimension[] = [
  "sleep",
  "nutrition",
  "training",
  "stress",
];

const DIMENSION_COLOR: Record<BranchDimension, string> = {
  sleep: "var(--accent)",
  nutrition: "#c8a66b",
  training: "#8fb8a1",
  stress: "#a88fb8",
  other: "var(--muted)",
};

export default function ProtocolPage() {
  const [store, setStore] = useState<ProtocolStore>({
    tree: null,
    history: [],
  });
  const [target, setTarget] = useState("Get recovery above 75% for 30 days");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const tree = store.tree;

  const apply = useCallback(
    (
      kind: Parameters<typeof pushMutation>[1],
      mutator: (t: ProtocolTree) => ProtocolTree,
    ) => {
      setStore((s) => {
        if (!s.tree) return s;
        const next = mutator(cloneTree(s.tree));
        return pushMutation(s, kind, next);
      });
    },
    [],
  );

  async function decompose() {
    const t = target.trim();
    if (!t) return;
    setBusy("decompose");
    try {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t }),
      });
      const json = (await res.json()) as { branches?: Branch[] };
      if (!json.branches || json.branches.length === 0) {
        setToast("Decomposition failed");
        return;
      }
      // Seed with any active commitments so the user isn't dropping existing work.
      let imported: Branch[] = [];
      try {
        const raw = localStorage.getItem("commitments-v1");
        if (raw) {
          imported = importFromCommitments(JSON.parse(raw) as Commitment[]);
        }
      } catch {
        /* ignore */
      }
      const next: ProtocolTree = {
        id: newId("t_"),
        target: t,
        createdAt: new Date().toISOString(),
        branches: [...json.branches, ...imported],
      };
      setStore((s) => pushMutation(s, "create", next));
      setToast("Tree decomposed");
    } catch {
      setToast("Decomposition failed");
    } finally {
      setBusy(null);
    }
  }

  async function redecompose(branch: Branch) {
    if (!tree) return;
    setBusy(branch.id);
    try {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: tree.target,
          dimension: branch.dimension,
          existingTitles: tree.branches
            .filter((b) => b.dimension === branch.dimension)
            .map((b) => b.title),
        }),
      });
      const json = (await res.json()) as { branch?: Branch };
      if (!json.branch) {
        setToast("Re-decompose failed");
        return;
      }
      const replacement = { ...json.branch, forkOf: branch.id };
      apply("redecompose", (t) => ({
        ...t,
        branches: t.branches.map((b) => (b.id === branch.id ? replacement : b)),
      }));
      setToast("Branch re-decomposed");
    } catch {
      setToast("Re-decompose failed");
    } finally {
      setBusy(null);
    }
  }

  function forkBranch(branch: Branch) {
    apply("fork", (t) => {
      const clone: Branch = {
        ...cloneTree({
          id: "",
          target: "",
          createdAt: "",
          branches: [branch],
        }).branches[0],
        id: newId("b_"),
        forkOf: branch.id,
        title: `${branch.title} (fork)`,
        habits: branch.habits.map((h) => ({
          ...h,
          id: newId("h_"),
          status: "pending" as const,
          streak: 0,
        })),
      };
      const idx = t.branches.findIndex((b) => b.id === branch.id);
      const next = [...t.branches];
      next.splice(idx + 1, 0, clone);
      return { ...t, branches: next };
    });
    setToast("Branch forked");
  }

  function toggleBranch(branch: Branch) {
    apply("toggleState", (t) => ({
      ...t,
      branches: t.branches.map((b) =>
        b.id === branch.id
          ? { ...b, state: b.state === "active" ? "paused" : "active" }
          : b,
      ),
    }));
  }

  function deleteBranch(branch: Branch) {
    apply("redecompose", (t) => ({
      ...t,
      branches: t.branches.filter((b) => b.id !== branch.id),
    }));
    setToast("Branch removed");
  }

  async function markHabit(
    branch: Branch,
    habit: Habit,
    status: Habit["status"],
  ) {
    const previous = habit.status;
    // Optimistic: apply locally first, then reconcile with server.
    apply("habitMark", (t) => ({
      ...t,
      branches: t.branches.map((b) =>
        b.id === branch.id
          ? {
              ...b,
              habits: b.habits.map((h) =>
                h.id === habit.id
                  ? {
                      ...h,
                      status,
                      lastMark: new Date().toISOString(),
                      streak:
                        status === "done" && previous !== "done"
                          ? h.streak + 1
                          : status === "skipped"
                            ? 0
                            : h.streak,
                    }
                  : h,
              ),
            }
          : b,
      ),
    }));

    try {
      const res = await fetch("/api/protocol/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: habit.id, status }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) throw new Error("server rejected mark");
    } catch {
      // Roll back: replace the mutation snapshot with the prior value.
      setStore((s) => {
        if (!s.tree) return s;
        const reverted = cloneTree(s.tree);
        for (const b of reverted.branches) {
          if (b.id !== branch.id) continue;
          for (const h of b.habits) {
            if (h.id === habit.id) {
              h.status = previous;
              h.streak = habit.streak;
              h.lastMark = habit.lastMark;
            }
          }
        }
        return { ...s, tree: reverted };
      });
      setToast("Mark failed — rolled back");
    }
  }

  function exportJson() {
    if (!tree) return;
    const blob = new Blob([JSON.stringify(tree, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `protocol-${tree.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportChecklist() {
    if (!tree) return;
    const lines: string[] = [`# ${tree.target}`, ""];
    for (const b of tree.branches) {
      lines.push(`## ${b.dimension.toUpperCase()} — ${b.title}`);
      if (b.rationale) lines.push(`_${b.rationale}_`);
      for (const h of b.habits) lines.push(`- [ ] ${h.label}`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `protocol-${tree.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetTree() {
    setStore({ tree: null, history: [] });
  }

  const status = useMemo(() => todaysHabitStatus(tree), [tree]);
  const adherence = useMemo(() => adherenceByDimension(tree), [tree]);
  const nextAction = useMemo(() => {
    if (!tree) return null;
    for (const b of tree.branches) {
      if (b.state !== "active") continue;
      for (const h of b.habits) {
        if (h.status === "pending") return `${b.title} — ${h.label}`;
      }
    }
    return tree.branches.length > 0 ? "All habits handled" : null;
  }, [tree]);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </Link>
        <h1
          className="text-xs font-mono uppercase tracking-[0.3em]"
          style={{ color: "var(--muted)" }}
        >
          Protocol
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStore(undoStore(store))}
            disabled={store.history.length === 0}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em]"
            style={{
              color:
                store.history.length === 0 ? "var(--border)" : "var(--muted)",
            }}
            aria-label="Undo"
          >
            <Undo2 size={14} />
            <span>Undo</span>
            <span className="tabular-nums">({store.history.length})</span>
          </button>
        </div>
      </header>

      {!tree ? (
        <section className="mb-16">
          <p className="section-label">Target</p>
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <textarea
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              rows={2}
              className="w-full bg-transparent outline-none text-lg leading-snug resize-none"
              style={{
                fontFamily: "Georgia, serif",
                color: "var(--foreground)",
              }}
            />
            <div
              className="flex items-center justify-between mt-4 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[11px] font-mono uppercase tracking-[0.2em]"
                style={{ color: "var(--muted)" }}
              >
                4 branches · 3-4 habits each
              </span>
              <button
                onClick={decompose}
                disabled={busy === "decompose" || !target.trim()}
                className="text-xs font-mono uppercase tracking-[0.15em] px-4 py-2 rounded-lg flex items-center gap-2"
                style={{
                  background: "var(--accent)",
                  color: "#0c0c0c",
                  opacity: busy === "decompose" ? 0.5 : 1,
                }}
              >
                {busy === "decompose" ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : null}
                Decompose
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mb-10">
            <ProtocolRings
              adherence={adherence}
              seed={{
                done: status.done,
                pending: status.pending,
                skipped: status.skipped,
                total: status.total,
                streak: longestStreak(tree),
                nextAction,
              }}
            />
          </section>

          <section className="mb-10">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="min-w-0">
                <p className="section-label" style={{ margin: 0 }}>
                  Target
                </p>
                <p
                  className="text-lg leading-snug mt-1"
                  style={{
                    fontFamily: "Georgia, serif",
                    color: "var(--foreground)",
                  }}
                >
                  {tree.target}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <IconButton onClick={exportJson} label="Export JSON">
                  <Download size={13} />
                </IconButton>
                <IconButton onClick={exportChecklist} label="Export checklist">
                  <Download size={13} />
                  <span className="ml-1 text-[10px]">.md</span>
                </IconButton>
                <IconButton onClick={resetTree} label="Reset">
                  <Trash2 size={13} />
                </IconButton>
              </div>
            </div>
          </section>

          <section className="space-y-4 mb-16">
            {sortBranches(tree.branches).map((branch, i) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                index={i}
                busy={busy === branch.id}
                onRedecompose={() => redecompose(branch)}
                onFork={() => forkBranch(branch)}
                onToggle={() => toggleBranch(branch)}
                onDelete={() => deleteBranch(branch)}
                onMark={(habit, status) => markHabit(branch, habit, status)}
              />
            ))}
          </section>
        </>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider"
            style={{
              background: "var(--elevated)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function longestStreak(tree: ProtocolTree): number {
  let max = 0;
  for (const b of tree.branches) {
    for (const h of b.habits) if (h.streak > max) max = h.streak;
  }
  return max;
}

function sortBranches(branches: Branch[]): Branch[] {
  const rank = (d: BranchDimension) => {
    const idx = DIMENSION_ORDER.indexOf(d);
    return idx === -1 ? 99 : idx;
  };
  return [...branches].sort((a, b) => rank(a.dimension) - rank(b.dimension));
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center text-[11px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors"
      style={{
        borderColor: "var(--border)",
        color: "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

function BranchCard({
  branch,
  index,
  busy,
  onRedecompose,
  onFork,
  onToggle,
  onDelete,
  onMark,
}: {
  branch: Branch;
  index: number;
  busy: boolean;
  onRedecompose: () => void;
  onFork: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMark: (habit: Habit, status: Habit["status"]) => void;
}) {
  const color = DIMENSION_COLOR[branch.dimension];
  const paused = branch.state === "paused";
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.05 * index,
      }}
      className="rounded-xl border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        opacity: paused ? 0.55 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: color }}
            />
            <span
              className="text-[10px] font-mono uppercase tracking-[0.25em]"
              style={{ color: "var(--muted)" }}
            >
              {branch.dimension}
              {branch.forkOf ? " · fork" : ""}
            </span>
          </div>
          <h3
            className="text-base leading-snug"
            style={{
              fontFamily: "Georgia, serif",
              color: "var(--foreground)",
            }}
          >
            {branch.title}
          </h3>
          {branch.rationale && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {branch.rationale}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <BranchAction onClick={onToggle} label={paused ? "Resume" : "Pause"}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </BranchAction>
          <BranchAction onClick={onFork} label="Fork">
            <GitFork size={12} />
          </BranchAction>
          <BranchAction
            onClick={onRedecompose}
            label="Re-decompose"
            busy={busy}
          >
            {busy ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
          </BranchAction>
          <BranchAction onClick={onDelete} label="Remove">
            <Trash2 size={12} />
          </BranchAction>
        </div>
      </div>
      <ul className="space-y-1">
        {branch.habits.map((h) => (
          <li key={h.id} className="habit-row">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() =>
                  onMark(h, h.status === "done" ? "pending" : "done")
                }
                className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border transition-colors"
                style={{
                  borderColor: h.status === "done" ? color : "var(--border)",
                  background: h.status === "done" ? color : "transparent",
                }}
                aria-label={h.status === "done" ? "Mark pending" : "Mark done"}
              >
                {h.status === "done" && (
                  <Check size={12} style={{ color: "#0c0c0c" }} />
                )}
              </button>
              <span
                className="text-sm truncate"
                style={{
                  color:
                    h.status === "done" ? "var(--muted)" : "var(--foreground)",
                  textDecoration:
                    h.status === "done" || h.status === "skipped"
                      ? "line-through"
                      : "none",
                }}
              >
                {h.label}
              </span>
            </div>
            <div
              className="flex items-center gap-2 shrink-0 text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              {h.streak > 0 && <span>{h.streak}d</span>}
              <button
                onClick={() =>
                  onMark(h, h.status === "skipped" ? "pending" : "skipped")
                }
                className="hover:underline"
                style={{
                  color: h.status === "skipped" ? "#b86a3f" : "var(--muted)",
                }}
              >
                skip
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

function BranchAction({
  onClick,
  label,
  busy,
  children,
}: {
  onClick: () => void;
  label: string;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className="p-1.5 rounded-md transition-colors"
      style={{
        color: "var(--muted)",
        opacity: busy ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
