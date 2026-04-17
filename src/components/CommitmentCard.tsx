"use client";

import { motion } from "framer-motion";

export type CommitmentMetric =
  | "habits_completed"
  | "tasks_completed"
  | "streak_days";

export type CommitmentStake = "money" | "public_post" | "custom";

export type CommitmentStatus = "active" | "complete" | "broken";

export interface Commitment {
  id: string;
  description: string;
  metric: CommitmentMetric;
  target: number;
  progress: number;
  durationDays: number;
  startDate: string;
  stakeType: CommitmentStake;
  stakeDetail?: string;
  status: CommitmentStatus;
}

const METRIC_LABEL: Record<CommitmentMetric, string> = {
  habits_completed: "habits",
  tasks_completed: "tasks",
  streak_days: "streak days",
};

function daysRemaining(c: Commitment): number {
  const start = new Date(c.startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + c.durationDays);
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function CommitmentCard({
  commitment,
  onClick,
  compact,
  index = 0,
}: {
  commitment: Commitment;
  onClick?: () => void;
  compact?: boolean;
  index?: number;
}) {
  const ratio =
    commitment.target > 0
      ? Math.min(1, commitment.progress / commitment.target)
      : 0;
  const size = compact ? 48 : 64;
  const stroke = compact ? 4 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  const color =
    commitment.status === "complete"
      ? "#4ade80"
      : commitment.status === "broken"
        ? "#b84141"
        : "var(--accent)";

  const days = daysRemaining(commitment);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border p-5 w-full transition-[border-color,box-shadow,background] duration-200"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.05 * index,
      }}
      whileHover={{ borderColor: "#333" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="relative shrink-0"
          style={{ width: size, height: size }}
        >
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
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: offset }}
              transition={{
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {Math.round(ratio * 100)}%
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-base leading-snug truncate"
            style={{
              fontFamily: "Georgia, serif",
              color: "var(--foreground)",
              textDecoration:
                commitment.status === "broken" ? "line-through" : "none",
            }}
          >
            {commitment.description}
          </p>
          <div
            className="flex items-center gap-3 mt-1.5 text-[11px] font-mono uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            <span>
              {commitment.progress}/{commitment.target}{" "}
              {METRIC_LABEL[commitment.metric]}
            </span>
            <span>·</span>
            <span>
              {commitment.status === "active"
                ? `${days}d left`
                : commitment.status === "complete"
                  ? "complete"
                  : "broken"}
            </span>
            {!compact && commitment.stakeType !== "custom" && (
              <>
                <span>·</span>
                <span>
                  {commitment.stakeType === "money" ? "$ stake" : "public post"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
