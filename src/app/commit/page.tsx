"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import {
  CommitmentCard,
  type Commitment,
  type CommitmentMetric,
  type CommitmentStake,
} from "@/components/CommitmentCard";

const STORAGE_KEY = "commitments-v1";

function load(): Commitment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Commitment[];
  } catch {
    return [];
  }
}

function save(items: Commitment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function CommitPage() {
  const [items, setItems] = useState<Commitment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Commitment | null>(null);

  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState<CommitmentMetric>("habits_completed");
  const [target, setTarget] = useState<number>(21);
  const [durationDays, setDurationDays] = useState<number>(21);
  const [stakeType, setStakeType] = useState<CommitmentStake>("public_post");
  const [stakeDetail, setStakeDetail] = useState("");

  useEffect(() => {
    setItems(load());
  }, []);

  const active = useMemo(
    () => items.filter((i) => i.status === "active"),
    [items],
  );
  const past = useMemo(
    () => items.filter((i) => i.status !== "active"),
    [items],
  );

  const persist = useCallback((next: Commitment[]) => {
    setItems(next);
    save(next);
  }, []);

  function reset() {
    setDescription("");
    setMetric("habits_completed");
    setTarget(21);
    setDurationDays(21);
    setStakeType("public_post");
    setStakeDetail("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const desc = description.trim();
    if (!desc) return;
    const item: Commitment = {
      id: newId(),
      description: desc,
      metric,
      target,
      progress: 0,
      durationDays,
      startDate: new Date().toISOString(),
      stakeType,
      stakeDetail: stakeDetail.trim() || undefined,
      status: "active",
    };
    persist([item, ...items]);
    reset();
    setShowForm(false);
  }

  function breakCommitment(id: string) {
    const next = items.map((i) =>
      i.id === id ? { ...i, status: "broken" as const } : i,
    );
    persist(next);
    setSelected(null);
  }

  function completeCommitment(id: string) {
    const next = items.map((i) =>
      i.id === id ? { ...i, status: "complete" as const } : i,
    );
    persist(next);
    setSelected(null);
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
          Commitments
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: showForm ? "var(--accent)" : "var(--muted)" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          <span>{showForm ? "Close" : "New"}</span>
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={submit}
            className="mb-10 rounded-xl border p-5 overflow-hidden"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="space-y-4">
              <div>
                <label
                  className="text-[11px] font-mono uppercase tracking-[0.2em] block mb-2"
                  style={{ color: "var(--muted)" }}
                >
                  Commitment
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Complete all daily habits for 21 days"
                  className="w-full bg-transparent outline-none text-base border-b py-2"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    fontFamily: "Georgia, serif",
                  }}
                  required
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Metric">
                  <select
                    value={metric}
                    onChange={(e) =>
                      setMetric(e.target.value as CommitmentMetric)
                    }
                    className="w-full bg-transparent outline-none text-sm py-1"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="habits_completed">Habits</option>
                    <option value="tasks_completed">Tasks</option>
                    <option value="streak_days">Streak days</option>
                  </select>
                </Field>
                <Field label="Target">
                  <input
                    type="number"
                    min={1}
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-sm py-1"
                    style={{ color: "var(--foreground)" }}
                  />
                </Field>
                <Field label="Days">
                  <input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-transparent outline-none text-sm py-1"
                    style={{ color: "var(--foreground)" }}
                  />
                </Field>
                <Field label="Stake">
                  <select
                    value={stakeType}
                    onChange={(e) =>
                      setStakeType(e.target.value as CommitmentStake)
                    }
                    className="w-full bg-transparent outline-none text-sm py-1"
                    style={{ color: "var(--foreground)" }}
                  >
                    <option value="public_post">Public post</option>
                    <option value="money">Money</option>
                    <option value="custom">Custom</option>
                  </select>
                </Field>
              </div>
              {stakeType === "custom" && (
                <Field label="Stake detail">
                  <input
                    type="text"
                    value={stakeDetail}
                    onChange={(e) => setStakeDetail(e.target.value)}
                    placeholder="e.g. $50 to Param's choice of charity"
                    className="w-full bg-transparent outline-none text-sm py-1 border-b"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </Field>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setShowForm(false);
                  }}
                  className="text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
                  style={{ color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-mono uppercase tracking-[0.15em] px-4 py-1.5 rounded-lg"
                  style={{
                    background: "var(--accent)",
                    color: "#0c0c0c",
                  }}
                >
                  Commit
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <section className="mb-12">
        <p className="section-label">Active ({active.length})</p>
        {active.length === 0 ? (
          <div
            className="text-center py-12 text-sm"
            style={{
              color: "var(--muted)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            No active commitments. Add one — accountability compounds.
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((c, i) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                index={i}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <p className="section-label">Past</p>
          <div className="space-y-3">
            {past.map((c, i) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact
                index={i}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border p-6"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-xs font-mono uppercase tracking-[0.2em] mb-3"
                style={{ color: "var(--muted)" }}
              >
                Commitment
              </p>
              <p
                className="text-xl leading-snug"
                style={{
                  fontFamily: "Georgia, serif",
                  color: "var(--foreground)",
                }}
              >
                {selected.description}
              </p>
              <dl
                className="mt-5 grid grid-cols-2 gap-y-3 text-sm font-mono"
                style={{ color: "var(--muted)" }}
              >
                <dt>Metric</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {selected.metric.replace(/_/g, " ")}
                </dd>
                <dt>Progress</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {selected.progress}/{selected.target}
                </dd>
                <dt>Duration</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {selected.durationDays}d
                </dd>
                <dt>Started</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {new Date(selected.startDate).toLocaleDateString()}
                </dd>
                <dt>Stake</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {selected.stakeDetail ||
                    (selected.stakeType === "money"
                      ? "Money"
                      : selected.stakeType === "public_post"
                        ? "Public post"
                        : "Custom")}
                </dd>
                <dt>Status</dt>
                <dd style={{ color: "var(--foreground)" }}>
                  {selected.status}
                </dd>
              </dl>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
                  style={{ color: "var(--muted)" }}
                >
                  Close
                </button>
                {selected.status === "active" && (
                  <>
                    <button
                      onClick={() => completeCommitment(selected.id)}
                      className="text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
                      style={{
                        background: "#4ade80",
                        color: "#0c0c0c",
                      }}
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => breakCommitment(selected.id)}
                      className="text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
                      style={{
                        background: "#b84141",
                        color: "#0c0c0c",
                      }}
                    >
                      Break
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="text-[11px] font-mono uppercase tracking-[0.2em] block mb-1"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </label>
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        {children}
      </div>
    </div>
  );
}
