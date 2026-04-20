"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, ArrowRight } from "lucide-react";
import type { DashboardData, Dimension } from "@/lib/types";
import { ScoreRing } from "@/components/ScoreRing";
import { DimensionCard } from "@/components/DimensionCard";
import { HabitList } from "@/components/HabitList";
import { StatCard } from "@/components/StatCard";
import { Heatmap } from "@/components/Heatmap";
import { CommitmentCard, type Commitment } from "@/components/CommitmentCard";
import { ProtocolRings } from "@/components/ProtocolRings";
import {
  adherenceByDimension,
  loadStore,
  todaysHabitStatus,
} from "@/lib/protocol";
import {
  SkeletonRing,
  SkeletonCard,
  SkeletonHabit,
  SkeletonStat,
} from "@/components/Skeleton";

const DIMENSIONS: Dimension[] = [
  "body",
  "mind",
  "skills",
  "habits",
  "social",
  "spirit",
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const COMMITMENTS_KEY = "commitments-v1";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [protocolSeed, setProtocolSeed] = useState<{
    adherence: { sleep: number; training: number; nutrition: number };
    status: { done: number; pending: number; skipped: number; total: number };
    hasTree: boolean;
  }>({
    adherence: { sleep: 0, training: 0, nutrition: 0 },
    status: { done: 0, pending: 0, skipped: 0, total: 0 },
    hasTree: false,
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json as DashboardData);
      }
    } catch {
      // silent fail, show stale data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMMITMENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Commitment[];
        setCommitments(parsed.filter((c) => c.status === "active").slice(0, 3));
      }
    } catch {
      /* ignore */
    }
    const store = loadStore();
    if (store.tree) {
      setProtocolSeed({
        adherence: adherenceByDimension(store.tree),
        status: todaysHabitStatus(store.tree),
        hasTree: true,
      });
    }
  }, []);

  const today = new Date();

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <motion.header
        className="flex items-start justify-between mb-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1
            className="text-xs font-mono uppercase tracking-[0.3em] mb-1.5"
            style={{ color: "var(--muted)" }}
          >
            Build Yourself
          </h1>
          <p className="text-sm font-mono" style={{ color: "var(--muted)" }}>
            {formatDate(today)}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--muted)" }}
          aria-label="Refresh data"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </motion.header>

      {/* Score Ring */}
      <section className="flex justify-center mb-12">
        {loading ? (
          <SkeletonRing />
        ) : (
          <ScoreRing score={data?.snapshot.overall ?? null} />
        )}
      </section>

      {/* Dimension Cards */}
      <section className="mb-10">
        <p className="section-label">Dimensions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {loading
            ? DIMENSIONS.map((d) => <SkeletonCard key={d} />)
            : DIMENSIONS.map((d, i) => (
                <DimensionCard
                  key={d}
                  data={
                    data?.snapshot.scores[d] ?? {
                      dimension: d,
                      score: null,
                      source: null,
                      updatedAt: new Date().toISOString(),
                    }
                  }
                  index={i}
                />
              ))}
        </div>
      </section>

      {/* Live Protocol */}
      {protocolSeed.hasTree ? (
        <section className="mb-10">
          <ProtocolRings
            adherence={protocolSeed.adherence}
            seed={{
              done: protocolSeed.status.done,
              pending: protocolSeed.status.pending,
              skipped: protocolSeed.status.skipped,
              total: protocolSeed.status.total,
              streak: data?.stats.streakDays ?? 0,
              nextAction: null,
            }}
          />
        </section>
      ) : (
        <section className="mb-10">
          <Link
            href="/protocol"
            className="block rounded-xl border p-5 text-center text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--muted)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            No protocol tree yet — decompose a target to begin.
          </Link>
        </section>
      )}

      {/* Today's Habits */}
      <section className="mb-10">
        <p className="section-label">Today&apos;s Habits</p>
        <div
          className="rounded-xl border p-4"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {loading ? (
            <SkeletonHabit />
          ) : (
            <HabitList tasks={data?.habits.tasks ?? []} />
          )}
        </div>
      </section>

      {/* Commitments */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label" style={{ margin: 0 }}>
            Commitments
          </p>
          <Link
            href="/commit"
            className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.15em]"
            style={{ color: "var(--muted)" }}
          >
            Manage
            <ArrowRight size={11} />
          </Link>
        </div>
        {commitments.length === 0 ? (
          <Link
            href="/commit"
            className="block rounded-xl border p-5 text-center text-sm transition-[border-color] hover:[--tw-border-opacity:1]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--muted)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            No active commitments. Add one to make it real.
          </Link>
        ) : (
          <div className="space-y-3">
            {commitments.map((c, i) => (
              <CommitmentCard key={c.id} commitment={c} index={i} compact />
            ))}
          </div>
        )}
      </section>

      {/* Stats Row */}
      <section className="mb-10">
        <p className="section-label">Stats</p>
        <div className="grid grid-cols-3 gap-3">
          {loading ? (
            <>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </>
          ) : (
            <>
              <StatCard
                label="Streak"
                value={`${data?.stats.streakDays ?? 0}d`}
                sub="consecutive days"
                index={0}
              />
              <StatCard
                label="Today"
                value={`${data?.stats.todayCompletion ?? 0}%`}
                sub="completion rate"
                index={1}
              />
              <StatCard
                label="7-Day"
                value={
                  data?.stats.weekTrend
                    ? `${data.stats.weekTrend.reduce((a, b) => a + b, 0)}`
                    : "0"
                }
                sub="tasks completed"
                index={2}
              />
            </>
          )}
        </div>
      </section>

      {/* Heatmap */}
      <section className="mb-10">
        {loading ? (
          <div
            className="h-32 rounded-xl animate-pulse"
            style={{ background: "var(--surface)" }}
          />
        ) : (
          <Heatmap data={data?.heatmap ?? []} />
        )}
      </section>

      {/* Footer */}
      <footer className="pt-6 pb-4 text-center">
        <span
          className="text-[10px] font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--border)" }}
        >
          v3
        </span>
      </footer>
    </main>
  );
}
