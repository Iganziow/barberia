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

  // Form state
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
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        logo: logo.trim() || null,
        address: address.trim() || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
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

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Configuraci&oacute;n</h1>
        <p className="text-sm text-stone-500">Datos de tu negocio, foto, ubicaci&oacute;n y URL p&uacute;blica</p>
      </div>

      {/* ── Business info ── */}
      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-stone-900">Datos del negocio</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="field-label">Nombre del negocio</label>
            <input className="input-field" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} placeholder="Ej: Mi Barbería" />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label">Descripci&oacute;n</label>
            <textarea
              className="input-field"
              rows={3}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
              placeholder="Breve descripción de tu barbería (máx. 500 caracteres)"
              maxLength={500}
            />
            <p className="text-[10px] text-stone-400 mt-0.5 text-right">{description.length}/500</p>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label">URL de reservas (slug)</label>
            <div className="flex items-center">
              <span className="rounded-l-lg border border-r-0 border-[#e8e2dc] bg-stone-50 px-3 py-2 text-sm text-stone-400 shrink-0">
                tuapp.cl/
              </span>
              <input className="input-field rounded-l-none flex-1" value={slug} onChange={(e) => { setSlug(e.target.value); setSaved(false); }} placeholder="mi-barberia" />
            </div>
            {slugPreview && slugPreview !== slug && (
              <p className="text-xs text-stone-400 mt-1">Se guardar&aacute; como: <span className="font-mono text-stone-600">{slugPreview}</span></p>
            )}
          </div>

          <div>
            <label className="field-label">Tel&eacute;fono</label>
            <input className="input-field" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} placeholder="+56 9 1234 5678" />
          </div>

          <div>
            <label className="field-label">Email de contacto</label>
            <input type="email" className="input-field" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} placeholder="contacto@tubarberia.cl" />
          </div>
        </div>
      </div>

      {/* ── Photo / Logo ── */}
      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-stone-900">Foto del negocio</h2>
        <p className="text-sm text-stone-500">URL de la imagen que se muestra en tu landing p&uacute;blica (sube tu foto a Imgur, Cloudinary o similar)</p>

        <input
          className="input-field"
          value={logo}
          onChange={(e) => { setLogo(e.target.value); setSaved(false); }}
          placeholder="https://ejemplo.com/mi-foto.jpg"
        />

        {logo && (
          <div className="rounded-lg overflow-hidden border border-[#e8e2dc] max-h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="Preview del logo"
              className="w-full h-48 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>

      {/* ── Location ── */}
      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-stone-900">Ubicaci&oacute;n</h2>
        <p className="text-sm text-stone-500">La direcci&oacute;n y coordenadas se muestran en tu landing con Google Maps</p>

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

        <p className="text-xs text-stone-400">
          Tip: busca tu direcci&oacute;n en Google Maps, haz clic derecho en el pin y copia las coordenadas.
        </p>

        {/* Map preview */}
        {hasCoords && (
          <div className="rounded-lg overflow-hidden border border-[#e8e2dc]">
            <iframe
              title="Ubicación"
              width="100%"
              height="200"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${latitude},${longitude}&zoom=16`}
            />
          </div>
        )}
      </div>

      {/* ── Save ── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Guardado</span>}
      </div>

      {/* ── QR + Link ── */}
      {org && (
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-stone-900">Link p&uacute;blico de reservas</h2>

          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <QRBooking slug={org.slug} size={180} />

            <div className="space-y-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Landing</p>
                <p className="text-sm font-mono text-stone-700 mt-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Booking</p>
                <p className="text-sm font-mono text-stone-700 mt-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}/book
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
