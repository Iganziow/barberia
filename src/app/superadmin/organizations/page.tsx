"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  createdAt: string;
  branches: number;
  services: number;
  users: number;
  barbers: number;
  appointments: number;
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/organizations")
      .then((r) => r.ok ? r.json() : { organizations: [] })
      .then((d) => setOrgs(d.organizations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-white/40 py-20">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizaciones</h1>
          <p className="text-sm text-white/50">{orgs.length} registrada{orgs.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/superadmin/organizations/new" className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition">
          + Nueva
        </Link>
      </div>

      {orgs.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-lg font-medium">Sin organizaciones</p>
          <p className="text-sm mt-1">Crea la primera para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/8 transition">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold">{org.name}</h3>
                  <p className="text-xs text-white/40 font-mono mt-0.5">/{org.slug}</p>
                  {org.email && <p className="text-xs text-white/30 mt-0.5">{org.email}</p>}
                </div>
                <span className="text-[10px] text-white/30">{new Date(org.createdAt).toLocaleDateString("es-CL")}</span>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-white/50">
                <span>{org.barbers} barbero{org.barbers !== 1 ? "s" : ""}</span>
                <span>{org.services} servicio{org.services !== 1 ? "s" : ""}</span>
                <span>{org.appointments} cita{org.appointments !== 1 ? "s" : ""}</span>
                <span>{org.users} usuario{org.users !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
