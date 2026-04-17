"use client";

import { motion } from "framer-motion";

interface HeatmapProps {
  data: { date: string; value: number }[];
}

export function Heatmap({ data }: HeatmapProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs font-mono uppercase tracking-[0.15em]"
          style={{ color: "var(--muted)" }}
        >
          90-Day Activity
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--muted)" }}
          >
            less
          </span>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                background:
                  intensity === 0
                    ? "var(--elevated)"
                    : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, var(--surface))`,
              }}
            />
          ))}
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--muted)" }}
          >
            more
          </span>
        </div>
      </div>
      <div className="heatmap-grid">
        {data.map((d, i) => {
          const intensity = d.value > 0 ? d.value / maxVal : 0;
          return (
            <motion.div
              key={d.date}
              className="heatmap-cell"
              title={`${d.date}: ${d.value}`}
              style={{
                background:
                  intensity === 0
                    ? "var(--elevated)"
                    : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, var(--surface))`,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.8 + i * 0.003,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
