"use client";

export function SkeletonRing() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-[200px] h-[200px] rounded-full animate-pulse"
        style={{ background: "var(--surface)" }}
      />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="dimension-card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg"
            style={{ background: "var(--elevated)" }}
          />
          <div>
            <div
              className="h-3 w-16 rounded"
              style={{ background: "var(--elevated)" }}
            />
            <div
              className="h-2 w-12 rounded mt-1.5"
              style={{ background: "var(--elevated)" }}
            />
          </div>
        </div>
        <div
          className="h-7 w-10 rounded"
          style={{ background: "var(--elevated)" }}
        />
      </div>
      <div
        className="w-full h-1 rounded-full"
        style={{ background: "var(--elevated)" }}
      />
    </div>
  );
}

export function SkeletonHabit() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="habit-row animate-pulse">
          <div className="flex items-center gap-3">
            <div
              className="w-[18px] h-[18px] rounded-full"
              style={{ background: "var(--elevated)" }}
            />
            <div
              className="h-3 rounded"
              style={{
                background: "var(--elevated)",
                width: `${120 + i * 40}px`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="stat-card animate-pulse">
      <div
        className="h-2 w-16 rounded"
        style={{ background: "var(--elevated)" }}
      />
      <div
        className="h-6 w-12 rounded mt-2"
        style={{ background: "var(--elevated)" }}
      />
    </div>
  );
}
