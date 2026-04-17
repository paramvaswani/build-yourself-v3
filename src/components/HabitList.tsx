"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Circle, CircleCheck } from "lucide-react";
import type { TodoistTask } from "@/lib/types";

interface HabitListProps {
  tasks: TodoistTask[];
  onToggle?: () => void;
}

export function HabitList({ tasks, onToggle }: HabitListProps) {
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  async function toggleTask(task: TodoistTask) {
    if (pending[task.id]) return;
    const currentlyCompleted = optimistic[task.id] ?? task.is_completed;
    const next = !currentlyCompleted;

    setOptimistic((s) => ({ ...s, [task.id]: next }));
    setPending((s) => ({ ...s, [task.id]: true }));
    setErrors((s) => ({ ...s, [task.id]: false }));

    try {
      const endpoint = next ? "/api/tasks/close" : "/api/tasks/reopen";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "toggle failed");
      }
      if (onToggle) onToggle();
    } catch {
      setOptimistic((s) => {
        const copy = { ...s };
        delete copy[task.id];
        return copy;
      });
      setErrors((s) => ({ ...s, [task.id]: true }));
    } finally {
      setPending((s) => {
        const copy = { ...s };
        delete copy[task.id];
        return copy;
      });
    }
  }

  if (tasks.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm font-mono"
        style={{ color: "var(--muted)" }}
      >
        No habits tracked today
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task, i) => {
        const isCompleted = optimistic[task.id] ?? task.is_completed;
        const isPending = pending[task.id];
        const hasError = errors[task.id];
        return (
          <motion.div
            key={task.id}
            className="habit-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.05 * i,
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => toggleTask(task)}
                disabled={isPending}
                className="shrink-0 flex items-center justify-center"
                style={{
                  cursor: isPending ? "wait" : "pointer",
                  opacity: isPending ? 0.5 : 1,
                }}
                aria-label={isCompleted ? "Reopen" : "Complete"}
              >
                {isCompleted ? (
                  <CircleCheck
                    size={18}
                    style={{ color: "var(--accent)" }}
                    strokeWidth={1.5}
                  />
                ) : (
                  <Circle
                    size={18}
                    style={{ color: "var(--muted)" }}
                    strokeWidth={1.5}
                  />
                )}
              </button>
              <span
                className="text-sm truncate"
                style={{
                  color: isCompleted ? "var(--muted)" : "var(--foreground)",
                  textDecoration: isCompleted ? "line-through" : "none",
                  transition: "color 0.2s ease",
                }}
              >
                {task.content}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasError && (
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: "#b86a3f" }}
                >
                  error
                </span>
              )}
              {task.due && (
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--muted)" }}
                >
                  {task.due.string}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
