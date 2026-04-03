"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-stone-100">
          <svg width="32" height="32" fill="none" stroke="#78716c" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a16 16 0 014.6-2.81M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-800 mb-2">Sin conexión</h1>
        <p className="text-sm text-stone-500 mb-6">
          No hay conexión a internet. Verifica tu red e intenta de nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
