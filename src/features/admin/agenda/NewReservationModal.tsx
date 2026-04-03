"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/modal";
import type {
  AgendaEvent,
  BarberOption,
  ServiceOption,
  ClientOption,
} from "@/types/agenda";
import { hasOverlap } from "./agendaOverlap";

type Status = "RESERVED" | "CONFIRMED" | "ARRIVED" | "DONE" | "CANCELED";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateInput(d: Date) {
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
  barbers,
  services,
  existingEvents,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  startISO: string | null;
  barberId: string;
  barbers: BarberOption[];
  services: ServiceOption[];
  existingEvents: AgendaEvent[];
  onCreate: (data: {
    clientId: string;
    clientName: string;
    serviceId: string;
    startISO: string;
    endISO: string;
    barberId: string;
    status: Status;
    price: number;
    notePublic?: string;
    noteInternal?: string;
  }) => void;
}) {
  const defaultService = services[0];

  const [status, setStatus] = useState<Status>("RESERVED");
  const [serviceId, setServiceId] = useState(defaultService?.id ?? "");
  const [selectedBarberId, setSelectedBarberId] = useState(barberId);

  // Client search
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  // New client inline form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientError, setClientError] = useState("");

  // Date/time
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
    return Math.floor(d.getMinutes() / 5) * 5;
  });

  // Extra info
  const [price, setPrice] = useState<number>(defaultService?.price ?? 0);
  const [notePublic, setNotePublic] = useState("");
  const [noteInternal, setNoteInternal] = useState("");

  useEffect(() => {
    if (!open || !startISO) return;
    const d = new Date(startISO);
    setDateStr(toLocalDateInput(d));
    setStartHour(d.getHours());
    setStartMinute(Math.floor(d.getMinutes() / 5) * 5);
  }, [open, startISO]);

  useEffect(() => {
    setSelectedBarberId(barberId);
  }, [barberId]);

  useEffect(() => {
    if (defaultService && !serviceId) {
      setServiceId(defaultService.id);
      setPrice(defaultService.price);
    }
  }, [defaultService, serviceId]);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  useEffect(() => {
    if (service) setPrice(service.price);
  }, [service]);

  // Client search with debounce
  const searchClients = useCallback((query: string) => {
    if (query.length < 2) {
      setClientResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    fetch(`/api/admin/clients?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((data) => {
        setClientResults(data.clients || []);
        setShowResults(true);
      })
      .catch(() => setClientResults([]))
      .finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    if (selectedClient) return; // don't search if already selected
    const timer = setTimeout(() => searchClients(clientQuery), 300);
    return () => clearTimeout(timer);
  }, [clientQuery, selectedClient, searchClients]);

  function selectClient(client: ClientOption) {
    setSelectedClient(client);
    setClientQuery(client.name);
    setShowResults(false);
  }

  function clearClient() {
    setSelectedClient(null);
    setClientQuery("");
    setClientResults([]);
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    setClientError("");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          phone: newClientPhone.trim() || undefined,
          email: newClientEmail.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const client: ClientOption = {
          id: data.client.id,
          name: data.client.name,
          email: data.client.email,
          phone: data.client.phone,
        };
        selectClient(client);
        setShowNewClient(false);
        setNewClientName("");
        setNewClientPhone("");
        setNewClientEmail("");
      } else {
        const err = await res.json().catch(() => ({ message: "Error al crear cliente" }));
        setClientError(err.message || "Error al crear cliente");
      }
    } catch {
      setClientError("Error de conexión");
    } finally {
      setCreatingClient(false);
    }
  }

  const computedStartISO = useMemo(() => {
    if (!dateStr) return "";
    return buildISOFromParts(dateStr, startHour, startMinute);
  }, [dateStr, startHour, startMinute]);

  const computedEndISO = useMemo(() => {
    if (!computedStartISO || !service) return "";
    return addMinutesISO(computedStartISO, service.durationMin);
  }, [computedStartISO, service]);

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
    !!selectedClient &&
    !!serviceId &&
    !!selectedBarberId &&
    !!computedStartISO &&
    overlap.ok &&
    status !== "CANCELED";

  function handleClose() {
    onClose();
  }

  function handleSave() {
    if (!canSave || !selectedClient) return;

    onCreate({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      serviceId,
      startISO: computedStartISO,
      endISO: computedEndISO,
      barberId: selectedBarberId,
      status,
      price: Number.isFinite(price) && price > 0 ? price : (service?.price ?? 0),
      notePublic: notePublic.trim() || undefined,
      noteInternal: noteInternal.trim() || undefined,
    });

    // Reset
    clearClient();
    setNotePublic("");
    setNoteInternal("");
    setStatus("RESERVED");
    handleClose();
  }

  return (
    <Modal
      open={open}
      title="Nueva reserva"
      onClose={handleClose}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleClose} type="button">Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave} type="button">Guardar reserva</button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status */}
        <div className="flex justify-end">
          <select className="input-field w-auto" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="RESERVED">Reservado</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="ARRIVED">Llegó</option>
            <option value="DONE">Realizado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </div>

        {/* Date & Time — single row */}
        <div>
          <label className="field-label">Fecha y hora</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input-field w-auto" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            <select className="input-field w-[70px]" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
              {hoursOptions(0, 23).map((h) => <option key={h} value={h}>{pad2(h)}</option>)}
            </select>
            <span className="text-stone-400 font-bold">:</span>
            <select className="input-field w-[70px]" value={startMinute} onChange={(e) => setStartMinute(Number(e.target.value))}>
              {minutesOptions(5).map((m) => <option key={m} value={m}>{pad2(m)}</option>)}
            </select>
            <span className="text-stone-400 text-sm">a</span>
            <span className="rounded-lg border border-[#e8e2dc] bg-stone-50 px-3 py-2 text-sm text-stone-500">
              {computedEndISO ? new Date(computedEndISO).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
            </span>
          </div>
        </div>

        {/* Client */}
        <div>
          <label className="field-label">Cliente</label>
          {selectedClient ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/20 bg-brand/5 px-3 py-2">
              <div className="text-sm">
                <span className="font-medium text-stone-900">{selectedClient.name}</span>
                {selectedClient.phone && <span className="ml-2 text-brand">{selectedClient.phone}</span>}
              </div>
              <button type="button" className="text-xs text-brand hover:text-brand-hover font-medium" onClick={clearClient}>Cambiar</button>
            </div>
          ) : (
            <div className="relative">
              <input className="input-field" value={clientQuery} onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); }} onFocus={() => { if (clientResults.length > 0) setShowResults(true); }} placeholder="Buscar por nombre, teléfono o email..." />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">Buscando...</div>}
              {showResults && clientResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#e8e2dc] bg-white shadow-lg max-h-48 overflow-y-auto">
                  {clientResults.map((c) => (
                    <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-brand/5 flex items-center justify-between text-sm" onClick={() => selectClient(c)}>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-stone-400">{c.phone || c.email || ""}</span>
                    </button>
                  ))}
                </div>
              )}
              {showResults && clientResults.length === 0 && clientQuery.length >= 2 && !searching && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#e8e2dc] bg-white shadow-lg p-3">
                  <p className="text-sm text-stone-400 mb-2">Sin resultados para &quot;{clientQuery}&quot;</p>
                  <button type="button" className="text-sm font-medium text-brand hover:text-brand-hover" onClick={() => { setNewClientName(clientQuery); setShowNewClient(true); setShowResults(false); }}>+ Crear nuevo cliente</button>
                </div>
              )}
            </div>
          )}
          {!selectedClient && !showNewClient && (
            <button type="button" className="mt-1.5 text-xs font-medium text-brand hover:text-brand-hover" onClick={() => { setShowNewClient(true); setShowResults(false); }}>+ Nuevo cliente</button>
          )}
          {showNewClient && (
            <div className="mt-2 rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-stone-700">Nuevo cliente</p>
              <input className="input-field" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nombre completo *" />
              <input className="input-field" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="Teléfono" />
              <input type="email" className="input-field" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email (opcional)" />
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-secondary text-xs" onClick={() => setShowNewClient(false)}>Cancelar</button>
                <button type="button" className="btn-primary text-xs" disabled={!newClientName.trim() || creatingClient} onClick={handleCreateClient}>{creatingClient ? "Creando..." : "Crear"}</button>
              </div>
              {clientError && <p className="text-xs text-red-500 mt-1">{clientError}</p>}
            </div>
          )}
        </div>

        {/* Barber + Service — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Profesional</label>
            <select className="input-field" value={selectedBarberId} onChange={(e) => setSelectedBarberId(e.target.value)}>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Servicio</label>
            <select className="input-field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {service && <p className="mt-1 text-xs text-stone-400">{service.durationMin} min</p>}
          </div>
        </div>

        {/* Overlap warning */}
        {!overlap.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Horario no disponible</p>
            <p className="mt-1">Se solapa con {overlap.conflicts.length} evento(s) existentes.</p>
          </div>
        )}

        {/* Extra info - collapsible */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border border-[#e8e2dc] bg-white px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 list-none">
            Información adicional
            <svg className="h-4 w-4 text-stone-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </summary>
          <div className="mt-2 space-y-3">
            <div>
              <label className="field-label">Precio</label>
              <input type="number" className="input-field" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Ej: 15000" />
            </div>
            <div>
              <label className="field-label">Nota pública</label>
              <textarea className="input-field min-h-[70px]" value={notePublic} onChange={(e) => setNotePublic(e.target.value)} placeholder="Visible para el cliente..." />
            </div>
            <div>
              <label className="field-label">Nota interna</label>
              <textarea className="input-field min-h-[70px]" value={noteInternal} onChange={(e) => setNoteInternal(e.target.value)} placeholder="Solo equipo..." />
            </div>
          </div>
        </details>
      </div>
    </Modal>
  );
}
