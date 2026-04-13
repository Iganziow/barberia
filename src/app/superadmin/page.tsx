"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/format";

type Stats = {
  organizations: number;
  users: number;
  activeBarbers: number;
  totalAppointments: number;
  totalRevenue: number;
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-white/40 py-20">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-white/50">Vista global de la plataforma</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Organizaciones", value: stats.organizations, color: "text-blue-400" },
            { label: "Usuarios", value: stats.users, color: "text-emerald-400" },
            { label: "Barberos activos", value: stats.activeBarbers, color: "text-amber-400" },
            { label: "Citas totales", value: stats.totalAppointments, color: "text-violet-400" },
            { label: "Revenue total", value: formatCLP(stats.totalRevenue), color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/superadmin/organizations" className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/15 transition">
          Ver organizaciones
        </Link>
        <Link href="/superadmin/organizations/new" className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition">
          + Nueva organización
        </Link>
      </div>
    </div>
  );
}
