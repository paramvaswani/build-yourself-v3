"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface RingValues {
  sleep: number;
  training: number;
  nutrition: number;
}

interface ProtocolRingsProps {
  adherence: RingValues;
  seed: {
    done: number;
    pending: number;
    skipped: number;
    total: number;
    streak: number;
    nextAction: string | null;
  };
}

const RING_META: Array<{
  key: keyof RingValues;
  label: string;
  color: string;
}> = [
  { key: "sleep", label: "Sleep", color: "var(--accent)" },
  { key: "training", label: "Training", color: "#8fb8a1" },
  { key: "nutrition", label: "Nutrition", color: "#c8a66b" },
];

type Connection = "idle" | "open" | "closed";

export function ProtocolRings({ adherence, seed }: ProtocolRingsProps) {
  const [live, setLive] = useState(adherence);
  const [tick, setTick] = useState<number | null>(null);
  const [connection, setConnection] = useState<Connection>("idle");
  const esRef = useRef<EventSource | null>(null);
  const seedKey = JSON.stringify({ adherence, seed });

  useEffect(() => {
    setLive(adherence);
  }, [adherence]);

  useEffect(() => {
    let aborted = false;

    async function openStream() {
      try {
        // EventSource can't POST, so we open a fetch-based reader.
        const res = await fetch("/api/stream/protocol", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adherence, ...seed }),
        });
        if (!res.ok || !res.body) {
          setConnection("closed");
          return;
        }
        setConnection("open");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const lines = chunk.split("\n");
            let event = "message";
            let data = "";
            for (const l of lines) {
              if (l.startsWith("event: ")) event = l.slice(7).trim();
              else if (l.startsWith("data: ")) data += l.slice(6);
            }
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (event === "state" && parsed?.adherence) {
                setLive(parsed.adherence as RingValues);
              } else if (
                event === "heartbeat" &&
                typeof parsed.tick === "number"
              ) {
                setTick(parsed.tick);
              }
            } catch {
              /* ignore malformed frame */
            }
          }
        }
        setConnection("closed");
      } catch {
        setConnection("closed");
      }
    }

    openStream();
    return () => {
      aborted = true;
      esRef.current?.close();
    };
    // seedKey intentionally re-opens the stream when seed values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="section-label" style={{ margin: 0 }}>
          Live Protocol
        </p>
        <span
          className="text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-1.5"
          style={{
            color:
              connection === "open"
                ? "var(--accent)"
                : connection === "closed"
                  ? "#b86a3f"
                  : "var(--muted)",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "currentColor",
              boxShadow:
                connection === "open" ? "0 0 8px currentColor" : "none",
            }}
          />
          {connection === "open"
            ? `live${tick !== null ? ` ${tick}` : ""}`
            : connection === "closed"
              ? "offline"
              : "connecting"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {RING_META.map((r) => (
          <Ring
            key={r.key}
            value={live[r.key]}
            label={r.label}
            color={r.color}
          />
        ))}
      </div>

      <dl
        className="mt-5 grid grid-cols-3 gap-3 text-[11px] font-mono uppercase tracking-wider"
        style={{ color: "var(--muted)" }}
      >
        <Stat label="Done" value={`${seed.done}/${seed.total}`} />
        <Stat label="Streak" value={`${seed.streak}d`} />
        <Stat label="Skipped" value={`${seed.skipped}`} />
      </dl>

      {seed.nextAction && (
        <p
          className="mt-4 text-sm leading-snug"
          style={{
            fontFamily: "Georgia, serif",
            color: "var(--foreground)",
          }}
        >
          Next: {seed.nextAction}
        </p>
      )}
    </div>
  );
}

function Ring({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const size = 88;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, value / 100));
  const offset = c * (1 - ratio);
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }} className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <motion.div
          key={Math.round(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center justify-center text-sm font-mono tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {Math.round(value)}
        </motion.div>
      </div>
      <span
        className="text-[10px] font-mono uppercase tracking-[0.2em]"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt>{label}</dt>
      <dd
        className="text-sm font-mono tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </dd>
    </div>
  );
}
