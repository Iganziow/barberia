"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ClientDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  loyaltyPoints: number;
  createdAt: string;
  stats: {
    totalVisits: number;
    totalSpent: number;
    lastVisitDate: string | null;
  };
  appointments: Array<{
    id: string;
    start: string;
    end: string;
    status: string;
    serviceName: string;
    barberName: string;
    price: number;
    payment: { amount: number; tip: number; method: string } | null;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  ARRIVED: "Llegó",
  IN_PROGRESS: "En Progreso",
  DONE: "Realizado",
  CANCELED: "Cancelado",
  NO_SHOW: "No asistió",
};

const STATUS_COLORS: Record<string, string> = {
  RESERVED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-sky-100 text-sky-700",
  ARRIVED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  DONE: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.client) setClient(data.client);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Cargando...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Link href="/admin/clients" className="text-violet-600 text-sm mt-2 inline-block">
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/clients"
            className="text-sm text-violet-600 hover:text-violet-800 mb-2 inline-block"
          >
            &larr; Clientes
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            {client.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {client.phone && <span>{client.phone}</span>}
            {client.email && !client.email.includes("@placeholder") && (
              <span>{client.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total visitas
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {client.stats.totalVisits}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total gastado
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatPrice(client.stats.totalSpent)}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Última visita
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {client.stats.lastVisitDate
              ? formatDate(client.stats.lastVisitDate)
              : "Sin visitas"}
          </p>
        </div>
      </div>

      {/* Appointment history */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Historial de citas
          </h2>
          <p className="text-xs text-gray-500">
            {client.appointments.length} cita
            {client.appointments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {client.appointments.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            Sin citas registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Servicio
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Profesional
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estado
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">
                  Precio
                </th>
              </tr>
            </thead>
            <tbody>
              {client.appointments.map((apt) => (
                <tr
                  key={apt.id}
                  className="border-b last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(apt.start)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(apt.start)} - {formatTime(apt.end)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {apt.serviceName}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {apt.barberName}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[apt.status] || "bg-gray-100"}`}
                    >
                      {STATUS_LABELS[apt.status] || apt.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">
                    {formatPrice(apt.price)}
                    {apt.payment && (
                      <div className="text-xs text-green-600">Pagado</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="rounded-2xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Información
        </p>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Cliente desde{" "}
            <span className="font-medium text-gray-900">
              {formatDate(client.createdAt)}
            </span>
          </p>
          {client.notes && (
            <p>
              Notas:{" "}
              <span className="font-medium text-gray-900">{client.notes}</span>
            </p>
          )}
          <p>
            Puntos de fidelización:{" "}
            <span className="font-medium text-gray-900">
              {client.loyaltyPoints}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
