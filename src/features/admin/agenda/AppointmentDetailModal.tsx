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
  const [editingPayment, setEditingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("CASH");

  useEffect(() => {
    if (!open || !appointmentId) return;
    setLoading(true);
    setCancelReason("");
    setShowCancelInput(false);
    setShowPayment(false);

    fetch(`/api/admin/appointments/${appointmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.appointment) setApt(data.appointment);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, appointmentId]);

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
    try {
      // If completing with payment, register payment first
      if (newStatus === "DONE" && showPayment && !apt.payment) {
        await fetch("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: apt.id,
            amount: payAmount,
            tip: 0,
            method: payMethod,
          }),
        });
      }

      const res = await fetch(`/api/admin/appointments/${apt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "CANCELED" && cancelReason
            ? { cancelReason }
            : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApt((prev) =>
          prev ? { ...prev, status: data.appointment.status } : null
        );
        setShowCancelInput(false);
        setCancelReason("");
        setShowPayment(false);
        onStatusChange();
      }
    } catch {
      // silent
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

          {/* Notes */}
          {(apt.notePublic || apt.noteInternal) && (
            <div className="rounded-xl border p-4 space-y-2">
              {apt.notePublic && (
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    Nota pública
                  </p>
                  <p className="text-sm">{apt.notePublic}</p>
                </div>
              )}
              {apt.noteInternal && (
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    Nota interna
                  </p>
                  <p className="text-sm">{apt.noteInternal}</p>
                </div>
              )}
            </div>
          )}

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
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                  Pago registrado
                </p>
                <button type="button" className="text-xs text-brand hover:text-brand-hover font-medium" onClick={() => { if (apt.payment) { setPayAmount(apt.payment.amount); setPayMethod(apt.payment.method); } setEditingPayment(true); }}>
                  Editar
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span>{formatCLP(apt.payment.amount)}</span>
                <span className="text-green-700 font-medium">
                  {({ CASH: "Efectivo", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro" } as Record<string, string>)[apt.payment.method] || apt.payment.method}
                </span>
              </div>
            </div>
          )}
          {apt.payment && editingPayment && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-stone-700">Editar pago</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Monto</label>
                  <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
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
                  await fetch(`/api/admin/payments/${pid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: payAmount, method: payMethod }) });
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
                <div className="mb-3 rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-900">
                    Registrar pago
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Monto</label>
                      <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
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
                    <button type="button" className="btn-secondary text-sm" onClick={() => setShowPayment(false)}>Volver</button>
                    <button type="button" className="btn-primary text-sm" disabled={updating} onClick={() => handleStatusChange("DONE")}>
                      {updating ? "..." : "Registrar pago"}
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
                  {transitions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusChange(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition ${
                        s === "CANCELED" || s === "NO_SHOW"
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : s === "DONE"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-brand text-white hover:bg-brand-hover"
                      }`}
                    >
                      {STATUS_LABELS[s] || s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
