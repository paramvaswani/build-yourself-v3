"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  CircleSlash,
  CheckCheck,
  Calendar,
  Activity,
  Sparkles,
  CircleCheck,
  FileText,
  Cloud,
} from "lucide-react";

type Status = "connected" | "disconnected" | "coming_soon" | "unknown";

interface Integration {
  key: string;
  name: string;
  description: string;
  status: Status;
  action?: { label: string; href: string; external?: boolean };
  note?: string;
  icon: React.ReactNode;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "connected") {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em]"
        style={{ color: "#4ade80" }}
      >
        <Check size={12} />
        Connected
      </span>
    );
  }
  if (status === "disconnected") {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em]"
        style={{ color: "var(--muted)" }}
      >
        <CircleDashed size={12} />
        Not configured
      </span>
    );
  }
  if (status === "coming_soon") {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em]"
        style={{ color: "var(--muted)" }}
      >
        <CircleSlash size={12} />
        Coming soon
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em]"
      style={{ color: "var(--muted)" }}
    >
      …
    </span>
  );
}

export default function SettingsPage() {
  const [todoist, setTodoist] = useState<Status>("unknown");
  const [claude, setClaude] = useState<Status>("unknown");
  const [whoop, setWhoop] = useState<Status>("unknown");
  const [notion, setNotion] = useState<Status>("unknown");
  const [bluesky, setBluesky] = useState<Status>("unknown");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = (await res.json()) as {
            snapshot?: {
              scores: Record<
                string,
                { source: string | null; score: number | null }
              >;
            };
            habits?: { tasks: unknown[] };
          };
          const hasHabits = Array.isArray(json.habits?.tasks);
          setTodoist(hasHabits ? "connected" : "disconnected");
          const body = json.snapshot?.scores?.body;
          setWhoop(
            body?.source === "whoop" && body.score !== null
              ? "connected"
              : "disconnected",
          );
        } else {
          setTodoist("disconnected");
          setWhoop("disconnected");
        }
      } catch {
        setTodoist("disconnected");
        setWhoop("disconnected");
      }

      try {
        const res = await fetch("/api/ai/brief/status");
        const json = (await res.json()) as { connected: boolean };
        setClaude(json.connected ? "connected" : "disconnected");
      } catch {
        setClaude("disconnected");
      }

      try {
        const res = await fetch("/api/notion/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "" }),
        });
        const json = (await res.json()) as { error?: string };
        if (json.error && /NOTION_TOKEN/i.test(json.error)) {
          setNotion("disconnected");
        } else {
          setNotion("connected");
        }
      } catch {
        setNotion("disconnected");
      }

      try {
        const res = await fetch("/api/bluesky/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "" }),
        });
        const json = (await res.json()) as { error?: string };
        if (json.error && /not configured/i.test(json.error)) {
          setBluesky("disconnected");
        } else {
          setBluesky("connected");
        }
      } catch {
        setBluesky("disconnected");
      }
    })();
  }, []);

  const integrations: Integration[] = [
    {
      key: "todoist",
      name: "Todoist",
      description: "Tasks, habits, completion rate",
      status: todoist,
      note:
        todoist === "disconnected"
          ? "Set TODOIST_API_TOKEN env var"
          : undefined,
      icon: <CircleCheck size={18} />,
    },
    {
      key: "claude",
      name: "Claude API",
      description: "Morning brief, coach, weekly synthesis",
      status: claude,
      note:
        claude === "disconnected" ? "Set ANTHROPIC_API_KEY env var" : undefined,
      icon: <Sparkles size={18} />,
    },
    {
      key: "whoop",
      name: "Whoop",
      description: "Recovery, strain, sleep",
      status: whoop,
      action:
        whoop === "disconnected"
          ? { label: "Connect", href: "/api/auth/whoop" }
          : undefined,
      icon: <Activity size={18} />,
    },
    {
      key: "gcal",
      name: "Google Calendar",
      description: "Meeting load, deep-work blocks",
      status: "coming_soon",
      icon: <Calendar size={18} />,
    },
    {
      key: "notion",
      name: "Notion",
      description: "Push weekly syntheses to journal",
      status: notion,
      note:
        notion === "disconnected"
          ? "Set NOTION_TOKEN + NOTION_JOURNAL_PAGE_ID env vars"
          : undefined,
      icon: <FileText size={18} />,
    },
    {
      key: "bluesky",
      name: "Bluesky",
      description: "Auto-post accountability updates",
      status: bluesky,
      note:
        bluesky === "disconnected"
          ? "Set BLUESKY_HANDLE + BLUESKY_APP_PASSWORD env vars"
          : undefined,
      icon: <Cloud size={18} />,
    },
  ];

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
          Settings
        </h1>
        <div className="w-20" />
      </header>

      <section className="mb-8">
        <p className="section-label">Integrations</p>
        <div className="space-y-3">
          {integrations.map((i, idx) => (
            <motion.div
              key={i.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05 * idx,
              }}
              className="rounded-xl border p-4 sm:p-5"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                opacity: i.status === "coming_soon" ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--elevated)" }}
                >
                  <span style={{ color: "var(--muted)" }}>{i.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {i.name}
                    </h3>
                    <StatusBadge status={i.status} />
                  </div>
                  <p
                    className="text-[12px] mt-0.5 font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    {i.description}
                  </p>
                  {i.note && (
                    <p
                      className="text-[11px] mt-1.5 font-mono"
                      style={{ color: "var(--muted)" }}
                    >
                      {i.note}
                    </p>
                  )}
                </div>
                {i.action && (
                  <a
                    href={i.action.href}
                    className="shrink-0 text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
                    style={{
                      background: "var(--accent)",
                      color: "#0c0c0c",
                    }}
                  >
                    {i.action.label}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div
        className="pt-6 flex items-center gap-2 text-xs font-mono"
        style={{ color: "var(--muted)" }}
      >
        <CheckCheck size={12} />
        <span>
          Edit env vars in Vercel project settings. Redeploy to apply.
        </span>
      </div>
    </main>
  );
}
