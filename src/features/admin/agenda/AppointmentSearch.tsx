"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STATUS_CONFIG } from "@/lib/constants";

type SearchResult = {
  id: string;
  start: string;
  end: string;
  status: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  barberId: string;
  barberName: string;
};

/**
 * Buscador global de citas por cliente (nombre, teléfono, email).
 * Botón en topbar que abre un overlay con input + resultados.
 * Debounce 300ms. Atajo: Cmd/Ctrl+K para abrir.
 */
export default function AppointmentSearch({
  onSelectAppointment,
}: {
  onSelectAppointment: (aptId: string, startISO: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K para abrir
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setResults([]);
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus al abrir (no hacemos setState aquí — la limpieza sucede en onOpenChange).
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }
  function handleOpen() {
    setQuery("");
    setResults([]);
    setOpen(true);
  }

  // Debounced search
  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/appointments/search?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => setResults(d.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + " · " + d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="grid h-9 w-9 place-items-center rounded-md border border-[#e8e2dc] bg-white text-stone-500 hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition"
        aria-label="Buscar cita"
        title="Buscar cita (Ctrl+K)"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 3a6 6 0 1 0 3.5 10.9l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0 0 9 3zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
          onClick={handleClose}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-xl rounded-xl border border-[#e8e2dc] bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e8e2dc]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="text-stone-400 shrink-0"
              >
                <path d="M9 3a6 6 0 1 0 3.5 10.9l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0 0 9 3zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono o email…"
                className="flex-1 text-[15px] outline-none placeholder:text-stone-400 bg-transparent"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:inline-flex items-center rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-xs text-stone-400">
                  Buscando…
                </div>
              )}
              {!loading && query.trim().length < 2 && (
                <div className="p-6 text-center">
                  <p className="text-xs text-stone-400">
                    Escribe al menos 2 caracteres
                  </p>
                  <p className="text-[11px] text-stone-300 mt-1">
                    Atajo: <kbd className="px-1 font-mono">Ctrl</kbd> +{" "}
                    <kbd className="px-1 font-mono">K</kbd>
                  </p>
                </div>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-400">
                  Sin resultados para &quot;{query}&quot;
                </div>
              )}
              {!loading && results.length > 0 && (
                <ul className="divide-y divide-[#f0ece8]">
                  {results.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.RESERVED;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAppointment(r.id, r.start);
                            handleClose();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 transition flex items-center gap-3"
                        >
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[14px] text-stone-900 truncate">
                                {r.clientName}
                              </span>
                              {r.clientPhone && (
                                <span className="text-[11px] text-stone-400 tabular-nums">
                                  {r.clientPhone}
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-stone-500 truncate">
                              {r.serviceName} · {r.barberName}
                            </div>
                          </div>
                          <div className="text-[11px] text-stone-500 tabular-nums text-right shrink-0">
                            {formatDateTime(r.start)}
                            <div
                              className={`text-[10px] mt-0.5 font-medium ${cfg.text}`}
                            >
                              {cfg.label}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
