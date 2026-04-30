/**
 * Skeleton primitives — placeholders animados consistentes para
 * estados de loading. Sin deps, usa Tailwind + variables MB.
 *
 * Uso:
 *   <Skeleton className="h-4 w-32" />        // base genérico
 *   <SkeletonCard />                         // card típica
 *   <SkeletonList count={5} />               // varias cards
 *   <SkeletonStat />                         // KPI dashboard
 *   <SkeletonTable rows={5} cols={4} />      // tabla
 *   <SkeletonText lines={3} />               // párrafo
 */

/** Bloque base con pulse — útil para casos custom. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-stone-200 ${className}`}
    />
  );
}

/** Card típica (avatar + 2 líneas + chip). Usado en listings (clientes, citas). */
export function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-[#e8e2dc] bg-white p-4"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-10 w-10 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 bg-stone-200 rounded w-2/5" />
          <div className="h-3 bg-stone-200 rounded w-3/5" />
        </div>
        <div className="h-6 w-16 bg-stone-200 rounded shrink-0" />
      </div>
    </div>
  );
}

/** Lista vertical de N cards. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Tabla con header + filas. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="rounded-xl border border-[#e8e2dc] bg-white overflow-hidden"
      aria-busy="true"
      aria-label="Cargando tabla"
    >
      {/* Header */}
      <div className="bg-stone-50 border-b border-[#e8e2dc] p-3 animate-pulse">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-stone-200 rounded"
              style={{ width: i === 0 ? "70%" : "50%" }}
            />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-[#e8e2dc]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 animate-pulse">
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  className="h-4 bg-stone-100 rounded"
                  style={{ width: c === 0 ? "80%" : "60%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stat card del dashboard (label + número grande + delta). */
export function SkeletonStat() {
  return (
    <div
      className="rounded-xl border border-[#e8e2dc] bg-white p-4"
      aria-busy="true"
      aria-label="Cargando estadística"
    >
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-2/5 bg-stone-200 rounded" />
        <div className="h-7 w-3/5 bg-stone-200 rounded" />
        <div className="h-3 w-1/4 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

/** Líneas de texto con anchos pseudo-naturales. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-10/12", "w-3/4", "w-5/6"];
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 bg-stone-200 rounded ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
