"use client";

import { useEffect, useState } from "react";
import QRBooking from "@/components/ui/QRBooking";

type OrgData = {
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
};

type BranchData = {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [, setBranch] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    fetch("/api/admin/organization")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.organization) {
          const o = d.organization;
          setOrg(o);
          setName(o.name);
          setSlug(o.slug);
          setDescription(o.description || "");
          setPhone(o.phone || "");
          setEmail(o.email || "");
          setLogo(o.logo || "");
        }
        if (d?.branch) {
          const b = d.branch;
          setBranch(b);
          setAddress(b.address || "");
          setLatitude(b.latitude ? String(b.latitude) : "");
          setLongitude(b.longitude ? String(b.longitude) : "");
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
        name: name.trim(), slug: slug.trim(), description: description.trim() || null,
        phone: phone.trim() || null, email: email.trim() || null, logo: logo.trim() || null,
        address: address.trim() || null,
        latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrg(d.organization);
      setSlug(d.organization.slug);
      if (d.branch) setBranch(d.branch);
      setSaved(true);
    } else {
      const d = await res.json().catch(() => ({ message: "Error al guardar" }));
      setError(d.message);
    }
    setSaving(false);
  }

  const slugPreview = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const hasCoords = latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  if (loading) return <div className="flex items-center justify-center py-20 text-stone-400">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header + Save */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Configuraci&oacute;n</h1>
          <p className="text-sm text-stone-500">Datos de tu negocio, foto y ubicaci&oacute;n</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600 font-medium">Guardado</span>}
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {/* Two column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Left column — main settings */}
        <div className="space-y-5">

          {/* Business info */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Datos del negocio</h2>
            <div className="space-y-3">
              <div>
                <label className="field-label">Nombre</label>
                <input className="input-field" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} placeholder="Mi Barbería" />
              </div>
              <div>
                <label className="field-label">Descripci&oacute;n</label>
                <textarea className="input-field" rows={2} value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false); }} placeholder="Breve descripción (máx. 500 chars)" maxLength={500} />
                <p className="text-[10px] text-stone-400 mt-0.5 text-right">{description.length}/500</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Tel&eacute;fono</label>
                  <input className="input-field" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} placeholder="+56 9 1234 5678" />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" className="input-field" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} placeholder="contacto@..." />
                </div>
              </div>
            </div>
          </div>

          {/* URL / Slug */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">URL p&uacute;blica</h2>
            <div className="flex items-center">
              <span className="rounded-l-lg border border-r-0 border-[#e8e2dc] bg-stone-50 px-3 py-2 text-sm text-stone-400 shrink-0">tuapp.cl/</span>
              <input className="input-field rounded-l-none flex-1" value={slug} onChange={(e) => { setSlug(e.target.value); setSaved(false); }} placeholder="mi-barberia" />
            </div>
            {slugPreview && slugPreview !== slug && (
              <p className="text-xs text-stone-400 mt-1.5">Se guardar&aacute; como: <span className="font-mono text-stone-600">{slugPreview}</span></p>
            )}
          </div>

          {/* Location */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-4">Ubicaci&oacute;n</h2>
            <div className="space-y-3">
              <div>
                <label className="field-label">Direcci&oacute;n</label>
                <input className="input-field" value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false); }} placeholder="Av. Providencia 1234, Santiago" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Latitud</label>
                  <input className="input-field" value={latitude} onChange={(e) => { setLatitude(e.target.value); setSaved(false); }} placeholder="-33.4372" />
                </div>
                <div>
                  <label className="field-label">Longitud</label>
                  <input className="input-field" value={longitude} onChange={(e) => { setLongitude(e.target.value); setSaved(false); }} placeholder="-70.6506" />
                </div>
              </div>
              <p className="text-[10px] text-stone-400">Tip: Google Maps &rarr; clic derecho en el pin &rarr; copiar coordenadas</p>
              {hasCoords && (
                <div className="rounded-lg overflow-hidden border border-[#e8e2dc]">
                  <iframe title="Ubicación" width="100%" height="180" style={{ border: 0 }} loading="lazy"
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — photo + QR */}
        <div className="space-y-5">

          {/* Photo */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-stone-900 mb-2">Foto</h2>
            <p className="text-xs text-stone-400 mb-3">URL de imagen para tu landing</p>
            <input className="input-field text-xs" value={logo} onChange={(e) => { setLogo(e.target.value); setSaved(false); }} placeholder="https://..." />
            {logo && (
              <div className="mt-3 rounded-lg overflow-hidden border border-[#e8e2dc]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Preview" className="w-full h-40 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          {/* QR */}
          {org && (
            <div className="rounded-xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 mb-3">QR de reserva</h2>
              <QRBooking slug={org.slug} size={160} />
              <div className="mt-3 space-y-1.5">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Landing</p>
                  <p className="text-xs font-mono text-stone-600 break-all">{typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Booking</p>
                  <p className="text-xs font-mono text-stone-600 break-all">{typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}/book</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
