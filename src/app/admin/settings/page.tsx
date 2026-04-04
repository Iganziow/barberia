"use client";

import { useEffect, useState } from "react";
import QRBooking from "@/components/ui/QRBooking";

type OrgData = {
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/admin/organization")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.organization) {
          const o = d.organization;
          setOrg(o);
          setName(o.name);
          setSlug(o.slug);
          setPhone(o.phone || "");
          setEmail(o.email || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      }),
    });

    if (res.ok) {
      const d = await res.json();
      setOrg(d.organization);
      setSlug(d.organization.slug);
      setSaved(true);
    } else {
      const d = await res.json().catch(() => ({ message: "Error al guardar" }));
      setError(d.message);
    }

    setSaving(false);
  }

  const slugPreview = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const hasChanges = org && (
    name.trim() !== org.name ||
    slugPreview !== org.slug ||
    (phone.trim() || null) !== org.phone ||
    (email.trim() || null) !== org.email
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Configuraci&oacute;n</h1>
        <p className="text-sm text-stone-500">Datos de tu negocio y URL p&uacute;blica de reservas</p>
      </div>

      {/* Organization info */}
      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-stone-900">Datos del negocio</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="field-label">Nombre del negocio</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              placeholder="Ej: Mi Barber&iacute;a"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label">URL de reservas (slug)</label>
            <div className="flex items-center gap-0">
              <span className="rounded-l-lg border border-r-0 border-[#e8e2dc] bg-stone-50 px-3 py-2 text-sm text-stone-400">
                tuapp.cl/
              </span>
              <input
                className="input-field rounded-l-none flex-1"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSaved(false); }}
                placeholder="mi-barberia"
              />
            </div>
            {slugPreview && slugPreview !== slug && (
              <p className="text-xs text-stone-400 mt-1">Se guardar&aacute; como: <span className="font-mono text-stone-600">{slugPreview}</span></p>
            )}
          </div>

          <div>
            <label className="field-label">Tel&eacute;fono</label>
            <input
              className="input-field"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
              placeholder="+56 9 1234 5678"
            />
          </div>

          <div>
            <label className="field-label">Email de contacto</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
              placeholder="contacto@tubarberia.cl"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Guardado</span>}
        </div>
      </div>

      {/* QR + Public link */}
      {org && (
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-stone-900">Link p&uacute;blico de reservas</h2>
          <p className="text-sm text-stone-500">
            Comparte este QR en tu local, redes sociales o tarjetas de visita. Los clientes escanean y reservan al instante.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <QRBooking slug={org.slug} size={180} />

            <div className="space-y-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">URL de booking</p>
                <p className="text-sm font-mono text-stone-700 mt-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}/book
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Landing p&uacute;blica</p>
                <p className="text-sm font-mono text-stone-700 mt-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
