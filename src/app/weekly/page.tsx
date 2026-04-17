"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Share } from "lucide-react";

interface WeeklyReport {
  summary: string;
  bestDay: string;
  worstDay: string;
  pattern: string;
  recommendation: string;
  week: string;
  generatedAt?: string;
  error?: string;
}

export default function WeeklyPage() {
  const [data, setData] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [pushState, setPushState] = useState<
    "idle" | "pushing" | "done" | "error"
  >("idle");
  const [pushMsg, setPushMsg] = useState<string>("");

  const load = useCallback(async (force = false) => {
    if (force) setRegen(true);
    try {
      const res = await fetch(`/api/ai/weekly${force ? "?force=1" : ""}`);
      const json = (await res.json()) as WeeklyReport;
      setData(json);
    } catch (err) {
      setData({
        summary: "",
        bestDay: "",
        worstDay: "",
        pattern: "",
        recommendation: "",
        week: "",
        error: err instanceof Error ? err.message : "error",
      });
    } finally {
      setLoading(false);
      setRegen(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pushToNotion() {
    if (!data) return;
    setPushState("pushing");
    setPushMsg("");
    const content = `Week: ${data.week}

Summary: ${data.summary}

Best Day: ${data.bestDay}
Worst Day: ${data.worstDay}

Pattern: ${data.pattern}

Recommendation: ${data.recommendation}`;
    try {
      const res = await fetch("/api/notion/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        url?: string;
        error?: string;
      };
      if (json.success) {
        setPushState("done");
        setPushMsg(json.url || "pushed");
      } else {
        setPushState("error");
        setPushMsg(json.error || "push failed");
      }
    } catch (err) {
      setPushState("error");
      setPushMsg(err instanceof Error ? err.message : "error");
    }
  }

  const section = "mb-10";
  const labelCls = "section-label";

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-16">
      <header className="flex items-center justify-between mb-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => load(true)}
            disabled={regen}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
              background: "var(--surface)",
            }}
          >
            <RefreshCw size={12} className={regen ? "animate-spin" : ""} />
            Regenerate
          </button>
          <button
            onClick={pushToNotion}
            disabled={!data || pushState === "pushing"}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
              background: "var(--surface)",
            }}
          >
            <Share size={12} />
            Notion
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p
          className="text-xs font-mono uppercase tracking-[0.3em] mb-3"
          style={{ color: "var(--muted)" }}
        >
          Weekly Synthesis
        </p>
        <h1
          className="text-4xl sm:text-5xl font-light tracking-tight mb-2 leading-[1.05]"
          style={{
            fontFamily: "Georgia, serif",
            color: "var(--foreground)",
          }}
        >
          {data?.week || (loading ? "…" : "—")}
        </h1>
        {data?.generatedAt && (
          <p
            className="text-[11px] font-mono mt-3"
            style={{ color: "var(--muted)" }}
          >
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        )}
      </motion.div>

      {pushState !== "idle" && (
        <div
          className="mt-6 text-xs font-mono"
          style={{
            color: pushState === "error" ? "#b86a3f" : "var(--muted)",
          }}
        >
          {pushState === "pushing" && "Pushing to Notion..."}
          {pushState === "done" && `Pushed. ${pushMsg}`}
          {pushState === "error" && `Push failed: ${pushMsg}`}
        </div>
      )}

      {loading && (
        <div
          className="mt-12 h-32 rounded-xl animate-pulse"
          style={{ background: "var(--surface)" }}
        />
      )}

      {!loading && data?.error && (
        <div
          className="mt-12 rounded-xl border p-5 text-sm"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          {data.error}
        </div>
      )}

      {!loading && data && !data.error && (
        <div className="mt-14 space-y-10">
          {data.summary && (
            <section className={section}>
              <p className={labelCls}>Summary</p>
              <p
                className="text-lg leading-relaxed"
                style={{
                  fontFamily: "Georgia, serif",
                  color: "var(--foreground)",
                }}
              >
                {data.summary}
              </p>
            </section>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            {data.bestDay && (
              <section>
                <p className={labelCls}>Best Day</p>
                <p
                  className="text-base leading-relaxed"
                  style={{
                    fontFamily: "Georgia, serif",
                    color: "var(--foreground)",
                  }}
                >
                  {data.bestDay}
                </p>
              </section>
            )}
            {data.worstDay && (
              <section>
                <p className={labelCls}>Worst Day</p>
                <p
                  className="text-base leading-relaxed"
                  style={{
                    fontFamily: "Georgia, serif",
                    color: "var(--foreground)",
                  }}
                >
                  {data.worstDay}
                </p>
              </section>
            )}
          </div>

          {data.pattern && (
            <section className={section}>
              <p className={labelCls}>Pattern</p>
              <p
                className="text-base leading-relaxed"
                style={{
                  fontFamily: "Georgia, serif",
                  color: "var(--foreground)",
                }}
              >
                {data.pattern}
              </p>
            </section>
          )}

          {data.recommendation && (
            <section className={section}>
              <p className={labelCls}>Recommendation</p>
              <p
                className="text-base leading-relaxed"
                style={{
                  fontFamily: "Georgia, serif",
                  color: "var(--foreground)",
                }}
              >
                {data.recommendation}
              </p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
