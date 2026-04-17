"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  index: number;
}

export function StatCard({ label, value, sub, index }: StatCardProps) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.6 + 0.1 * index,
      }}
    >
      <span
        className="text-[11px] font-mono uppercase tracking-[0.15em]"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-mono font-light tabular-nums mt-1"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-[11px] font-mono mt-0.5"
          style={{ color: "var(--muted)" }}
        >
          {sub}
        </span>
      )}
    </motion.div>
  );
}
