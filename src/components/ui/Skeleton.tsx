/**
 * Reusable skeleton loader component.
 * Uses pulse animation and adapts to dark mode via CSS variables.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-stone-200 dark:bg-stone-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-32" />
          <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-stone-200 dark:bg-stone-700 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-stone-100 dark:bg-stone-800 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
