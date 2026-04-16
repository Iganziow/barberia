"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import type { BarberOption, ServiceOption } from "@/types/agenda";
import { todayLocalDateString } from "@/lib/date-utils";

type Slot = { start: string; end: string };

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function QuickTimeSearchModal({
  open,
  onClose,
  branchId,
  barbers,
  services,
  onSelectSlot,
}: {
  open: boolean;
  onClose: () => void;
  branchId: string;
  barbers: BarberOption[];
  services: ServiceOption[];
  /**
   * Cuando el admin elige un slot, se informa al contenedor para que abra la
   * modal de reserva con esos datos pre-rellenados.
   */
  onSelectSlot: (info: {
    barberId: string;
    startISO: string;
    endISO: string;
    serviceId: string;
  }) => void;
}) {
  const today = todayLocalDateString();
  const [serviceId, setServiceId] = useState<string>(services[0]?.id || "");
  const [date, setDate] = useState<string>(today);
  const [barberId, setBarberId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{
    barberId: string;
    barberName: string;
    slots: Slot[];
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!serviceId || !date) {
      setError("Elige servicio y fecha");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);

    try {
      if (barberId) {
        const res = await fetch(
          `/api/admin/availability?serviceId=${serviceId}&date=${date}&barberId=${barberId}`
        );
        if (!res.ok) throw new Error("search failed");
        const data: { slots: Slot[] } = await res.json();
        const name = barbers.find((b) => b.id === barberId)?.name || "Profesional";
        setResults([{ barberId, barberName: name, slots: data.slots }]);
      } else {
        // Buscar por branch: devuelve conteo de slots por barbero; luego buscar slots
        // del barbero con más disponibilidad (simplificación: primer barbero con slots).
        const res = await fetch(
          `/api/admin/availability?serviceId=${serviceId}&date=${date}&branchId=${branchId}`
        );
        if (!res.ok) throw new Error("search failed");
        const data: {
          barbers: Array<{ id: string; name: string; availableSlots: number }>;
        } = await res.json();
        // Pedimos slots para los 3 barberos con mayor disponibilidad.
        const topBarbers = data.barbers
          .filter((b) => b.availableSlots > 0)
          .sort((a, b) => b.availableSlots - a.availableSlots)
          .slice(0, 3);
        const perBarber = await Promise.all(
          topBarbers.map(async (b) => {
            const r = await fetch(
              `/api/admin/availability?serviceId=${serviceId}&date=${date}&barberId=${b.id}`
            );
            if (!r.ok) return { barberId: b.id, barberName: b.name, slots: [] as Slot[] };
            const d: { slots: Slot[] } = await r.json();
            return { barberId: b.id, barberName: b.name, slots: d.slots.slice(0, 8) };
          })
        );
        setResults(perBarber);
      }
    } catch {
      setError("No se pudo buscar disponibilidad");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResults(null);
    setError(null);
  }

  return (
    <Modal open={open} title="Búsqueda rápida de hora" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Servicio
          </label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              reset();
            }}
            className="h-9 w-full rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMin}min
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => {
                setDate(e.target.value);
                reset();
              }}
              className="h-9 w-full rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Profesional (opcional)
            </label>
            <select
              value={barberId}
              onChange={(e) => {
                setBarberId(e.target.value);
                reset();
              }}
              className="h-9 w-full rounded-lg border border-[#e8e2dc] bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            >
              <option value="">Cualquiera</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="h-9 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar horarios disponibles"}
        </button>

        {error && (
          <p className="text-xs text-red-600" role="alert">{error}</p>
        )}

        {results && (
          <div className="pt-2 space-y-3 max-h-72 overflow-auto">
            {results.length === 0 && (
              <p className="text-xs text-stone-500">Sin resultados.</p>
            )}
            {results.map((r) => (
              <div key={r.barberId}>
                <div className="text-xs font-semibold text-stone-700 mb-1.5">
                  {r.barberName}
                </div>
                {r.slots.length === 0 ? (
                  <p className="text-[11px] text-stone-400">Sin horas libres.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {r.slots.slice(0, 12).map((s) => (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() =>
                          onSelectSlot({
                            barberId: r.barberId,
                            startISO: s.start,
                            endISO: s.end,
                            serviceId,
                          })
                        }
                        className="rounded-md border border-[#e8e2dc] bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:border-brand hover:bg-brand/5 transition"
                      >
                        {formatTime(s.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
