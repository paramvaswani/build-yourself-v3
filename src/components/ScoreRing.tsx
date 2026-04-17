"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 6,
}: ScoreRingProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? score / 100 : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {mounted && score !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.3,
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score !== null ? (
          <>
            <motion.span
              className="text-5xl font-mono font-light tracking-tight"
              style={{ color: "var(--foreground)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.5,
              }}
            >
              {score}
            </motion.span>
            <span
              className="text-xs font-mono uppercase tracking-[0.2em] mt-1"
              style={{ color: "var(--muted)" }}
            >
              overall
            </span>
          </>
        ) : (
          <>
            <span
              className="text-5xl font-mono font-light"
              style={{ color: "var(--muted)" }}
            >
              --
            </span>
            <span
              className="text-xs font-mono uppercase tracking-[0.2em] mt-1"
              style={{ color: "var(--muted)" }}
            >
              no data
            </span>
          </>
        )}
      </div>
    </div>
  );
}
