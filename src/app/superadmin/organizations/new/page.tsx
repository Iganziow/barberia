"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/superadmin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName, orgSlug: orgSlug || autoSlug(orgName), orgEmail, orgPhone,
        branchName: branchName || "Sede Principal", branchAddress,
        adminName: adminName || "Administrador", adminEmail, adminPassword,
      }),
    });

    if (res.ok) {
      router.push("/superadmin/organizations");
    } else {
      const d = await res.json().catch(() => ({ message: "Error al crear" }));
      setError(d.message);
    }

    setSaving(false);
  }

  const canSave = orgName.trim() && adminEmail.trim() && adminPassword.trim() && adminPassword.length >= 6;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva organizaci&oacute;n</h1>
        <p className="text-sm text-white/50">Crea una barbería con su admin y sucursal</p>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-5">
        <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider">Negocio</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Nombre del negocio *</label>
            <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={orgName} onChange={(e) => { setOrgName(e.target.value); if (!orgSlug) setOrgSlug(autoSlug(e.target.value)); }} placeholder="Ej: Barbería Premium" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Slug (URL)</label>
            <div className="flex items-center">
              <span className="rounded-l-lg bg-white/5 border border-r-0 border-white/10 px-2 py-2 text-xs text-white/30">tuapp.cl/</span>
              <input className="flex-1 rounded-r-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} placeholder="barberia-premium" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Email contacto</label>
              <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} placeholder="contacto@..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Tel&eacute;fono</label>
              <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+56..." />
            </div>
          </div>
        </div>

        <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider pt-2">Sucursal</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Nombre sucursal</label>
            <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Sede Principal" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Direcci&oacute;n</label>
            <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="Av. Principal 123" />
          </div>
        </div>

        <h2 className="font-bold text-white/80 text-sm uppercase tracking-wider pt-2">Administrador</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Nombre</label>
            <input className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Administrador" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Email *</label>
            <input type="email" className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@barberia.cl" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Contrase&ntilde;a * (m&iacute;n. 6 caracteres)</label>
            <input type="password" className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={() => router.back()} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/15 transition">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={saving || !canSave} className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
          {saving ? "Creando..." : "Crear organizaci\u00F3n"}
        </button>
      </div>
    </div>
  );
}
