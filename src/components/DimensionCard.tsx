"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Brain,
  Wrench,
  Repeat,
  Users,
  Flame,
  type LucideIcon,
} from "lucide-react";
import type { Dimension, DimensionScore } from "@/lib/types";

const DIMENSION_CONFIG: Record<Dimension, { label: string; icon: LucideIcon }> =
  {
    body: { label: "Body", icon: Heart },
    mind: { label: "Mind", icon: Brain },
    skills: { label: "Skills", icon: Wrench },
    habits: { label: "Habits", icon: Repeat },
    social: { label: "Social", icon: Users },
    spirit: { label: "Spirit", icon: Flame },
  };

interface DimensionCardProps {
  data: DimensionScore;
  index: number;
}

export function DimensionCard({ data, index }: DimensionCardProps) {
  const config = DIMENSION_CONFIG[data.dimension];
  const Icon = config.icon;
  const hasScore = data.score !== null;

  return (
    <motion.div
      className="dimension-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.1 * index,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--elevated)" }}
          >
            <Icon
              size={16}
              style={{ color: hasScore ? "var(--accent)" : "var(--muted)" }}
            />
          </div>
          <div>
            <h3
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {config.label}
            </h3>
            {data.source && (
              <span
                className="text-[11px] font-mono"
                style={{ color: "var(--muted)" }}
              >
                via {data.source}
              </span>
            )}
          </div>
        </div>
        <span
          className="text-2xl font-mono font-light tabular-nums"
          style={{ color: hasScore ? "var(--foreground)" : "var(--muted)" }}
        >
          {hasScore ? data.score : "--"}
        </span>
      </div>

      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: "var(--elevated)" }}
      >
        {hasScore && (
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent)" }}
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2 + 0.1 * index,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
