"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import { formatCLP } from "@/lib/format";
import { STATUS_CONFIG } from "@/lib/constants";

type AppointmentDetail = {
  id: string;
  start: string;
  end: string;
  status: string;
  price: number;
  notePublic: string | null;
  noteInternal: string | null;
  cancelReason: string | null;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  payment: {
    id: string;
    amount: number;
    tip: number;
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  createdAt: string;
};

// Derive label/color maps from shared config
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
);
const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, `${v.bg} ${v.text}`])
);

// Workflow: which statuses can transition to which
const STATUS_TRANSITIONS: Record<string, string[]> = {
  RESERVED: ["CONFIRMED", "CANCELED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "CANCELED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "CANCELED"],
  IN_PROGRESS: ["DONE"],
  DONE: [],
  CANCELED: [],
  NO_SHOW: [],
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) + " " + d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentDetailModal({
  open,
  appointmentId,
  onClose,
  onStatusChange,
}: {
  open: boolean;
  appointmentId: string | null;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [apt, setApt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);

  // Payment form
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payTip, setPayTip] = useState(0);
  const [editingPayment, setEditingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Nota interna: se puede editar en cualquier momento, pero especialmente
  // al cerrar la cita para capturar preferencias del cliente ("pidió tapper
  // fade", "conversó de su viaje") y poder consultarlas la próxima vez.
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => {
    if (!open || !appointmentId) return;
    setLoading(true);
    setCancelReason("");
    setShowCancelInput(false);
    setShowPayment(false);
    setErrorMsg("");
    setNoteInput("");
    setNoteSaved(false);
    setEditingNote(false);

    fetch(`/api/admin/appointments/${appointmentId}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ message: "No se pudo cargar la cita" }));
          throw new Error(err.message || "Error al cargar la cita");
        }
        return r.json();
      })
      .then((data) => {
        if (data?.appointment) {
          setApt(data.appointment);
          setNoteInput(data.appointment.noteInternal || "");
        }
      })
      .catch((e: Error) => setErrorMsg(e.message || "Error de conexión"))
      .finally(() => setLoading(false));
  }, [open, appointmentId]);

  // Guarda (o actualiza) la nota interna de la cita. Se puede llamar en
  // cualquier momento — incluso después de DONE — para que el barbero
  // anote preferencias del cliente luego de atenderlo.
  async function saveNote() {
    if (!apt) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/admin/appointments/${apt.id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteInternal: noteInput.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "No se pudo guardar la nota" }));
        setErrorMsg(err.message || "Error al guardar la nota");
        return;
      }
      setApt((prev) => (prev ? { ...prev, noteInternal: noteInput.trim() || null } : null));
      setNoteSaved(true);
      setEditingNote(false);
      setTimeout(() => setNoteSaved(false), 2500);
      onStatusChange();
    } catch {
      setErrorMsg("Error de conexión al guardar la nota");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!apt) return;

    if (newStatus === "CANCELED" && !showCancelInput) {
      setShowCancelInput(true);
      return;
    }

    // When marking as DONE, show payment form first (if no payment yet)
    if (newStatus === "DONE" && !showPayment && !apt.payment) {
      setPayAmount(apt.price);
      setPayMethod("CASH");
      setShowPayment(true);
      return;
    }

    setUpdating(true);
    setErrorMsg("");
    try {
      // Una sola llamada atómica: el backend crea el payment (si aplica)
      // y cambia el status en una transacción Prisma. Si falla cualquiera
      // de los dos, ninguno persiste — no queda más el estado "pagué pero
      // no terminé la cita".
      const payload: Record<string, unknown> = {
        status: newStatus,
      };
      if (newStatus === "CANCELED" && cancelReason) {
        payload.cancelReason = cancelReason;
      }
      if (newStatus === "DONE" && showPayment && !apt.payment) {
        payload.payment = {
          amount: payAmount,
          tip: payTip,
          method: payMethod,
        };
      }
      // Si hay nota y el campo cambió, la incluimos en la misma
      // transacción para guardar preferencia + cerrar cita de un tiro.
      if ((noteInput.trim() || null) !== (apt.noteInternal ?? null)) {
        payload.noteInternal = noteInput.trim() || null;
      }

      const res = await fetch(`/api/admin/appointments/${apt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "No se pudo actualizar el estado" }));
        throw new Error(err.message || "Error al actualizar el estado");
      }

      const data = await res.json();
      setApt((prev) =>
        prev
          ? {
              ...prev,
              status: data.appointment.status,
              // Reflejar la nota persistida (si se envió)
              noteInternal:
                payload.noteInternal !== undefined
                  ? (payload.noteInternal as string | null)
                  : prev.noteInternal,
            }
          : null
      );
      setShowCancelInput(false);
      setCancelReason("");
      setShowPayment(false);
      onStatusChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de conexión";
      setErrorMsg(msg);
    } finally {
      setUpdating(false);
    }
  }

  const transitions = apt ? STATUS_TRANSITIONS[apt.status] || [] : [];

  return (
    <Modal open={open} title="Detalle de cita" onClose={onClose}>
      {loading && (
        <div className="flex items-center justify-center py-12 text-stone-400">
          Cargando...
        </div>
      )}

      {!loading && !apt && errorMsg && (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm font-medium text-red-600">{errorMsg}</p>
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      )}

      {errorMsg && apt && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {!loading && apt && (
        <div className="text-stone-900 space-y-5">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[apt.status] || "bg-gray-100"}`}
            >
              {STATUS_LABELS[apt.status] || apt.status}
            </span>
            <span className="text-xs text-stone-400">
              Creada {formatDateTime(apt.createdAt)}
            </span>
          </div>

          {/* Client info */}
          <div className="rounded-xl border p-4">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Cliente
            </p>
            <p className="font-semibold text-lg">{apt.clientName}</p>
            {apt.clientPhone && (
              <p className="text-sm text-stone-600">{apt.clientPhone}</p>
            )}
            {apt.clientEmail && (
              <p className="text-sm text-stone-600">{apt.clientEmail}</p>
            )}
          </div>

          {/* Appointment details */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Servicio
                </p>
                <p className="font-medium">{apt.serviceName}</p>
                <p className="text-sm text-stone-500">
                  {apt.serviceDuration} min
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Precio
                </p>
                <p className="font-semibold text-lg">
                  {formatCLP(apt.price)}
                </p>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between">
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Profesional
                </p>
                <p className="font-medium">{apt.barberName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Horario
                </p>
                <p className="font-medium">{formatDateTime(apt.start)}</p>
                <p className="text-sm text-stone-500">
                  hasta{" "}
                  {new Date(apt.end).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje del cliente — lo dejó al reservar. Read-only.
              Visualmente diferenciado (azul) de la nota interna del equipo
              (ámbar) para que no se confundan. */}
          {apt.notePublic && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
              <div className="flex items-start gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="text-sky-600 mt-0.5 shrink-0"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-widest mb-1">
                    Mensaje del cliente
                  </p>
                  <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                    {apt.notePublic}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nota interna — siempre visible, editable. Este es el campo
              clave para capturar preferencias ("pidió tapper fade") que
              el equipo consulta la próxima vez que el cliente vuelve. */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-600">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest">
                  Nota interna del equipo
                </p>
              </div>
              {!editingNote && apt.noteInternal && (
                <button
                  type="button"
                  onClick={() => setEditingNote(true)}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900"
                >
                  Editar
                </button>
              )}
            </div>

            {/* Vista read-only si hay nota y no está editando */}
            {apt.noteInternal && !editingNote ? (
              <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                {apt.noteInternal}
              </p>
            ) : (
              <>
                <textarea
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-y min-h-[70px]"
                  value={noteInput}
                  onChange={(e) => { setNoteInput(e.target.value); setNoteSaved(false); }}
                  placeholder="Ej: Pidió tapper fade con degradado bajo. Le gusta conversar poco. Alérgico a cierto producto."
                  maxLength={2000}
                />
                <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                  <p className="text-[10px] text-stone-500 leading-snug">
                    Visible solo para el equipo. Aparece en el historial del cliente.
                  </p>
                  <div className="flex items-center gap-2">
                    {noteSaved && (
                      <span className="text-[11px] text-emerald-700 font-semibold">✓ Guardada</span>
                    )}
                    {apt.noteInternal && editingNote && (
                      <button
                        type="button"
                        onClick={() => { setNoteInput(apt.noteInternal || ""); setEditingNote(false); }}
                        className="text-xs font-medium text-stone-500 hover:text-stone-800"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={savingNote || noteInput.trim() === (apt.noteInternal || "")}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingNote ? "Guardando..." : "Guardar nota"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Cancel reason */}
          {apt.cancelReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium text-red-500">
                Motivo de cancelación
              </p>
              <p className="text-sm text-red-700">{apt.cancelReason}</p>
            </div>
          )}

          {/* Payment info — editable */}
          {apt.payment && !editingPayment && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-500">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.7 5.3a.5.5 0 010 .7l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7.3 10l3.7-3.7a.5.5 0 01.7 0z" />
                  </svg>
                  Pagado
                </p>
                <button type="button" className="text-[11px] text-stone-500 hover:text-brand font-medium" onClick={() => { if (apt.payment) { setPayAmount(apt.payment.amount); setPayTip(apt.payment.tip); setPayMethod(apt.payment.method); } setEditingPayment(true); }}>
                  Editar
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-stone-900 text-base tabular-nums">{formatCLP(apt.payment.amount)}</span>
                  {apt.payment.tip > 0 && (
                    <span className="ml-2 text-xs text-emerald-600 font-medium">+ {formatCLP(apt.payment.tip)} propina</span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-stone-700 border border-stone-200">
                  {apt.payment.method === "CASH" && "💵"}
                  {apt.payment.method === "DEBIT_CARD" && "💳"}
                  {apt.payment.method === "CREDIT_CARD" && "💳"}
                  {apt.payment.method === "TRANSFER" && "🏦"}
                  {apt.payment.method === "OTHER" && "📝"}
                  {({ CASH: "Efectivo", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro" } as Record<string, string>)[apt.payment.method] || apt.payment.method}
                </span>
              </div>
            </div>
          )}
          {apt.payment && editingPayment && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-stone-700">Editar pago</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Monto</label>
                  <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
                </div>
                <div>
                  <label className="field-label">Propina</label>
                  <input type="number" className="input-field" value={payTip} onChange={(e) => setPayTip(Number(e.target.value))} />
                </div>
                <div>
                  <label className="field-label">Método</label>
                  <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="CASH">Efectivo</option>
                    <option value="DEBIT_CARD">Débito</option>
                    <option value="CREDIT_CARD">Crédito</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-secondary text-xs" onClick={() => setEditingPayment(false)}>Cancelar</button>
                <button type="button" className="btn-primary text-xs" disabled={updating} onClick={async () => {
                  const pid = apt.payment?.id;
                  if (!pid) return;
                  setUpdating(true);
                  await fetch(`/api/admin/payments/${pid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: payAmount, tip: payTip, method: payMethod }) });
                  setEditingPayment(false);
                  setUpdating(false);
                  onClose();
                }}>
                  {updating ? "..." : "Guardar"}
                </button>
              </div>
            </div>
          )}

          {/* Status actions */}
          {transitions.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                Cambiar estado
              </p>

              {showPayment && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-emerald-900">
                      Registrar pago para completar
                    </p>
                    <span className="text-xs text-stone-500">
                      Precio: {formatCLP(apt.price)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="field-label">Monto *</label>
                      <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="field-label">Propina</label>
                      <input type="number" className="input-field" value={payTip} min={0} placeholder="0" onChange={(e) => setPayTip(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="field-label">Método *</label>
                      <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        <option value="CASH">💵 Efectivo</option>
                        <option value="DEBIT_CARD">💳 Débito</option>
                        <option value="CREDIT_CARD">💳 Crédito</option>
                        <option value="TRANSFER">🏦 Transferencia</option>
                        <option value="OTHER">📝 Otro</option>
                      </select>
                    </div>
                  </div>
                  {payTip > 0 && (
                    <p className="text-xs text-emerald-700">
                      Total cobrado: {formatCLP(payAmount + payTip)} ({formatCLP(payAmount)} + {formatCLP(payTip)} propina)
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="button" className="btn-secondary text-sm" onClick={() => setShowPayment(false)}>
                      Cancelar (no cambiar estado)
                    </button>
                    <button type="button" className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50" disabled={updating || payAmount <= 0} onClick={() => handleStatusChange("DONE")}>
                      {updating ? "Procesando..." : "✓ Completar y registrar pago"}
                    </button>
                  </div>
                </div>
              )}

              {showCancelInput && (
                <div className="mb-3 space-y-2">
                  <input
                    className="input-field"
                    placeholder="Motivo de cancelación (opcional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => setShowCancelInput(false)}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                      disabled={updating}
                      onClick={() => handleStatusChange("CANCELED")}
                    >
                      {updating ? "..." : "Confirmar cancelación"}
                    </button>
                  </div>
                </div>
              )}

              {!showCancelInput && !showPayment && (
                <div className="flex flex-wrap gap-2">
                  {transitions.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isDestructive = s === "CANCELED" || s === "NO_SHOW";
                    const isDone = s === "DONE";
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={updating}
                        onClick={() => handleStatusChange(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition flex items-center gap-2 ${
                          isDestructive
                            ? "border border-red-200 text-red-700 hover:bg-red-50"
                            : isDone
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                              : `border-2 hover:shadow-sm`
                        }`}
                        style={
                          !isDestructive && !isDone
                            ? { borderColor: cfg?.color, color: cfg?.color }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: cfg?.color }}
                        />
                        {cfg?.label || s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
