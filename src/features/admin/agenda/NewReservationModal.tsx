"use client";

import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import type { AgendaEvent } from "./AgendaCalendar";
import { hasOverlap } from "./agendaOverlap";

type Service = { id: string; name: string; durationMin: number; price: number };
type Status = "RESERVED" | "CONFIRMED" | "ARRIVED" | "DONE" | "CANCELED";

type BarberOption = { id: string; name: string };

const MOCK_SERVICES: Service[] = [
  { id: "svc-1", name: "Corte de Cabello", durationMin: 60, price: 15000 },
  { id: "svc-2", name: "Barba", durationMin: 30, price: 8000 },
];

const MOCK_BARBERS: BarberOption[] = [
  { id: "barber-1", name: "daniel Silva" },
  { id: "barber-2", name: "Juan Pérez" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateInput(d: Date) {
  // yyyy-mm-dd en hora local
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function minutesOptions(step = 5) {
  const arr: number[] = [];
  for (let m = 0; m < 60; m += step) arr.push(m);
  return arr;
}

function hoursOptions(min = 0, max = 23) {
  const arr: number[] = [];
  for (let h = min; h <= max; h++) arr.push(h);
  return arr;
}

function buildISOFromParts(dateStr: string, hour: number, minute: number) {
  // construir ISO desde local (sin depender de UTC)
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hour, minute, 0, 0);
  return dt.toISOString();
}

function addMinutesISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export default function NewReservationModal({
  open,
  onClose,
  startISO,
  barberId,
  existingEvents,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  startISO: string | null;
  barberId: string;
  existingEvents: AgendaEvent[];
  onCreate: (data: {
    customerName: string;
    serviceId: string;
    startISO: string;
    endISO: string;
    barberId: string;
    status: Status;
    price: number;
    notePublic?: string;
    noteInternal?: string;
    repeat?: { enabled: boolean };
  }) => void;
}) {
  // --- estado base ---
  const [status, setStatus] = useState<Status>("RESERVED");
  const [customerQuery, setCustomerQuery] = useState("");
  const [serviceId, setServiceId] = useState(MOCK_SERVICES[0].id);

  // profesional: por ahora permitimos cambiar en UI (admin)
  const [selectedBarberId, setSelectedBarberId] = useState(barberId);

  // fecha/hora (tipo AgendaPro)
  const [dateStr, setDateStr] = useState<string>(() => {
    const d = startISO ? new Date(startISO) : new Date();
    return toLocalDateInput(d);
  });
  const [startHour, setStartHour] = useState<number>(() => {
    const d = startISO ? new Date(startISO) : new Date();
    return d.getHours();
  });
  const [startMinute, setStartMinute] = useState<number>(() => {
    const d = startISO ? new Date(startISO) : new Date();
    // redondeo a 5 min para que sea más "agenda"
    const m = d.getMinutes();
    return Math.floor(m / 5) * 5;
  });

  // repeater placeholder (luego lo hacemos real)
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  // info adicional
  const [extraOpen, setExtraOpen] = useState(false);
  const [price, setPrice] = useState<number>(() => MOCK_SERVICES[0].price);
  const [notePublic, setNotePublic] = useState("");
  const [noteInternal, setNoteInternal] = useState("");

  // Cuando se abre con otro slot, precargar fecha/hora
  useEffect(() => {
    if (!open) return;
    if (!startISO) return;

    const d = new Date(startISO);
    setDateStr(toLocalDateInput(d));
    setStartHour(d.getHours());
    setStartMinute(Math.floor(d.getMinutes() / 5) * 5);
  }, [open, startISO]);

  // si cambia barberId desde afuera
  useEffect(() => {
    setSelectedBarberId(barberId);
  }, [barberId]);

  const service = useMemo(
    () => MOCK_SERVICES.find((s) => s.id === serviceId)!,
    [serviceId]
  );

  // Mantener precio por defecto por servicio (pero editable)
  useEffect(() => {
    setPrice(service.price);
  }, [serviceId]); // intencional: al cambiar servicio, resetea precio

  // ISO calculados desde los selects (local -> iso)
  const computedStartISO = useMemo(() => {
    if (!dateStr) return "";
    return buildISOFromParts(dateStr, startHour, startMinute);
  }, [dateStr, startHour, startMinute]);

  const computedEndISO = useMemo(() => {
    if (!computedStartISO) return "";
    return addMinutesISO(computedStartISO, service.durationMin);
  }, [computedStartISO, service.durationMin]);

  // solapamiento
  const overlap = useMemo(() => {
    if (!computedStartISO || !computedEndISO) {
      return { ok: true, conflicts: [] as AgendaEvent[] };
    }
    return hasOverlap(existingEvents, {
      startISO: computedStartISO,
      endISO: computedEndISO,
      barberId: selectedBarberId,
    });
  }, [existingEvents, computedStartISO, computedEndISO, selectedBarberId]);

  const canSave =
    customerQuery.trim().length > 0 &&
    !!serviceId &&
    !!selectedBarberId &&
    !!computedStartISO &&
    overlap.ok &&
    status !== "CANCELED";

  function handleClose() {
    onClose();
    // no reseteo todo para que sea cómodo; si quieres, lo hacemos “reset on close”
  }

  function handleSave() {
    if (!canSave) return;

    onCreate({
      customerName: customerQuery.trim(),
      serviceId,
      startISO: computedStartISO,
      endISO: computedEndISO,
      barberId: selectedBarberId,
      status,
      price: Number.isFinite(price) ? price : service.price,
      notePublic: notePublic.trim() ? notePublic.trim() : undefined,
      noteInternal: noteInternal.trim() ? noteInternal.trim() : undefined,
      repeat: { enabled: repeatEnabled },
    });

    setCustomerQuery("");
    setNotePublic("");
    setNoteInternal("");
    setExtraOpen(false);
    setRepeatEnabled(false);
    setStatus("RESERVED");
    handleClose();
  }

  return (
    <Modal
      open={open}
      title="Nueva reserva"
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            className="px-4 py-2 rounded-md border text-black bg-white hover:bg-gray-50"
            onClick={handleClose}
            type="button"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-md border text-violet-700 bg-white hover:bg-violet-50"
              type="button"
              onClick={() => {
                // placeholder
                alert("TODO: Agregar otra reserva (flujo AgendaPro)");
              }}
            >
              Agregar otra reserva
            </button>

            <button
              className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={!canSave}
              type="button"
            >
              Guardar reserva
            </button>
          </div>
        </div>
      }
    >
      <div className="text-black">
        {/* Header interno tipo AgendaPro: estado arriba a la derecha */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-gray-600">
            {/* Aquí podríamos mostrar sucursal / etc */}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-sky-400" />
            <select
              className="border rounded-md px-3 py-2 bg-white text-black"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              <option value="RESERVED">Reservado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="ARRIVED">Llegó</option>
              <option value="DONE">Realizado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Card principal */}
        <div className="mt-4 rounded-xl border bg-white p-4">
          {/* Fecha / Hora */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <label className="block text-sm font-semibold mb-2">Fecha</label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-md border bg-white text-gray-600">
                  📅
                </span>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2 bg-white text-black"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:justify-self-end">
              <label className="block text-sm font-semibold mb-2">Hora</label>

              <div className="flex flex-wrap items-center gap-2">
                {/* inicio */}
                <select
                  className="border rounded-md px-3 py-2 bg-white text-black"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                >
                  {hoursOptions(0, 23).map((h) => (
                    <option key={h} value={h}>
                      {pad2(h)}
                    </option>
                  ))}
                </select>

                <span className="text-gray-600 font-semibold">:</span>

                <select
                  className="border rounded-md px-3 py-2 bg-white text-black"
                  value={startMinute}
                  onChange={(e) => setStartMinute(Number(e.target.value))}
                >
                  {minutesOptions(5).map((m) => (
                    <option key={m} value={m}>
                      {pad2(m)}
                    </option>
                  ))}
                </select>

                <span className="text-gray-600">a</span>

                {/* fin (calculado) */}
                <input
                  className="w-[120px] border rounded-md px-3 py-2 bg-gray-50 text-black"
                  value={new Date(computedEndISO || computedStartISO).toLocaleTimeString(
                    "es-CL",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                  disabled
                />

                <button
                  type="button"
                  className="ml-2 inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black"
                  onClick={() => setRepeatEnabled((v) => !v)}
                >
                  <span className="inline-block">🔁</span>
                  <span className="underline">Repetir</span>
                </button>
              </div>

              {repeatEnabled && (
                <div className="mt-2 text-sm text-gray-600">
                  (Placeholder) Luego agregamos frecuencia / fin / repeticiones.
                </div>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2">Cliente</label>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <input
                className="w-full border rounded-md px-3 py-2 bg-white text-black placeholder-gray-400"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Busca por nombre, apellido, rut, email"
              />
              <button
                type="button"
                className="whitespace-nowrap px-4 py-2 rounded-md border bg-white hover:bg-violet-50 text-violet-700"
                onClick={() => alert("TODO: abrir modal Nuevo cliente")}
              >
                ➕ Nuevo cliente
              </button>
            </div>
          </div>

          {/* Profesional */}
          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2">
              Profesional
            </label>
            <div className="flex items-center gap-2">
              <select
                className="w-full border rounded-md px-3 py-2 bg-white text-black"
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
              >
                {MOCK_BARBERS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="h-10 w-10 rounded-md border bg-white hover:bg-gray-50"
                title="Bloquear agenda (placeholder)"
                onClick={() => alert("TODO: acción rápida (ej. bloquear)")}
              >
                🔒
              </button>
            </div>
          </div>

          {/* Servicio */}
          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2">Servicios</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-white text-black"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {MOCK_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="mt-2 text-sm text-gray-600">
              Duración: <span className="font-medium text-black">{service.durationMin} min</span>
            </div>
          </div>

          {/* Solapamiento */}
          {!overlap.ok && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">Horario no disponible</p>
              <p className="mt-1">
                Se solapa con {overlap.conflicts.length} evento(s) existentes para
                este profesional.
              </p>
            </div>
          )}
        </div>

        {/* Información adicional (acordeón) */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExtraOpen((v) => !v)}
            className="w-full rounded-xl border bg-white px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="font-semibold text-gray-800">
              Información adicional
            </span>
            <span className="text-gray-700">{extraOpen ? "▴" : "▾"}</span>
          </button>

          {/* OJO con espacios: usamos contenedor con transición + padding interno controlado */}
          <div
            className={[
              "overflow-hidden transition-[max-height,opacity] duration-200",
              extraOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
            ].join(" ")}
          >
            <div className="mt-3 rounded-xl border bg-white p-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Precio
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 bg-white text-black"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Ej: 15000"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2">
                  Notas compartidas con el cliente
                </label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 bg-white text-black min-h-[90px]"
                  value={notePublic}
                  onChange={(e) => setNotePublic(e.target.value)}
                  placeholder="Ej: llegar 5 min antes..."
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2">
                  Nota interna
                </label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 bg-white text-black min-h-[90px]"
                  value={noteInternal}
                  onChange={(e) => setNoteInternal(e.target.value)}
                  placeholder="Solo equipo..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
