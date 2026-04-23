"use client";

import { useEffect, useMemo, useState } from "react";
import QRBooking from "@/components/ui/QRBooking";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

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

// ─── Icons ──────────────────────────────────────────────────────────────
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
function IconStore() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 9V7l2-4h14l2 4v2M3 9a3 3 0 006 0m0 0a3 3 0 006 0m0 0a3 3 0 006 0M3 9v12h18V9" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
function IconQR() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3m0 3h-3M20 14v7M14 20h0" />
    </svg>
  );
}

// ─── Helper: card section con icon avatar + título ──────────────────────
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-[#e8e2dc]">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-stone-900">{title}</h2>
          {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────
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
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar la configuración");
        return r.json();
      })
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
      .catch((e: Error) => setError(e.message || "Error de conexión al cargar"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (latitude) {
      const lat = Number(latitude);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        setError("Latitud debe estar entre -90 y 90");
        return;
      }
    }
    if (longitude) {
      const lng = Number(longitude);
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        setError("Longitud debe estar entre -180 y 180");
        return;
      }
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!slug.trim()) {
      setError("La URL pública es obligatoria");
      return;
    }
    if (logo.trim()) {
      try {
        const u = new URL(logo.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          setError("La foto debe ser una URL http:// o https://");
          return;
        }
      } catch {
        setError("La URL de la foto no es válida. Ej: https://tu-sitio.com/foto.jpg");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
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
        setError(d.message || "No se pudo guardar");
      }
    } catch {
      setError("Error de conexión. Revisa tu red e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const slugPreview = useMemo(
    () =>
      slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    [slug]
  );
  const hasCoords =
    latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Configuración
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Datos de tu negocio, URL pública, ubicación y foto de portada
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold">✓ Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 disabled:opacity-50"
          >
            <IconSave />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <UserAvatarBadge />
        </div>
      </div>

      {/* ── Error global ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          <div className="space-y-5">
            <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
            <div className="h-80 rounded-2xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* ── Left column: main settings ──────────────────────── */}
          <div className="space-y-5">
            {/* Business info */}
            <Section
              icon={<IconStore />}
              title="Datos del negocio"
              description="Esta información aparece en tu landing pública y en el booking."
            >
              <div className="space-y-4">
                <div>
                  <label className="field-label">Nombre</label>
                  <input
                    className="input-field"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSaved(false); }}
                    placeholder="Mi Barbería"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="field-label">Descripción</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
                    placeholder="Breve descripción (máx. 500 chars)"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-stone-400 mt-1 text-right tabular-nums">
                    {description.length}/500
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Teléfono</label>
                    <input
                      className="input-field"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
                      placeholder="contacto@..."
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* URL / Slug */}
            <Section
              icon={<IconLink />}
              title="URL pública"
              description="El enlace donde tus clientes reservan."
            >
              <div className="flex items-stretch">
                <span className="rounded-l-lg border border-r-0 border-[#e8e2dc] bg-stone-50 px-3 py-2 text-sm text-stone-500 shrink-0 flex items-center">
                  tuapp.cl/
                </span>
                <input
                  className="input-field rounded-l-none flex-1 font-mono"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSaved(false); }}
                  placeholder="mi-barberia"
                />
              </div>
              {slugPreview && slugPreview !== slug && (
                <p className="text-xs text-stone-500 mt-2">
                  Se guardará como:{" "}
                  <span className="font-mono text-stone-800 font-semibold">{slugPreview}</span>
                </p>
              )}
            </Section>

            {/* Location */}
            <Section
              icon={<IconPin />}
              title="Ubicación"
              description="Dirección y coordenadas para el mapa del landing."
            >
              <div className="space-y-4">
                <div>
                  <label className="field-label">Dirección</label>
                  <input
                    className="input-field"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); setSaved(false); }}
                    placeholder="Av. Providencia 1234, Santiago"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Latitud</label>
                    <input
                      className="input-field tabular-nums"
                      value={latitude}
                      onChange={(e) => { setLatitude(e.target.value); setSaved(false); }}
                      placeholder="-33.4372"
                    />
                  </div>
                  <div>
                    <label className="field-label">Longitud</label>
                    <input
                      className="input-field tabular-nums"
                      value={longitude}
                      onChange={(e) => { setLongitude(e.target.value); setSaved(false); }}
                      placeholder="-70.6506"
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-stone-50 border border-[#e8e2dc] px-3 py-2 text-xs text-stone-500 flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 text-stone-400 shrink-0">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z" />
                  </svg>
                  <p className="leading-snug">
                    Tip: Google Maps → clic derecho en el pin → copiar coordenadas
                  </p>
                </div>
                {hasCoords && (
                  <div className="rounded-xl overflow-hidden border border-[#e8e2dc]">
                    <iframe
                      title="Ubicación"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`}
                    />
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* ── Right column: photo + QR ─────────────────────────── */}
          <div className="space-y-5">
            {/* Photo */}
            <Section
              icon={<IconImage />}
              title="Foto"
              description="URL de imagen para tu landing."
            >
              <input
                className="input-field text-xs font-mono"
                value={logo}
                onChange={(e) => { setLogo(e.target.value); setSaved(false); }}
                placeholder="https://..."
              />
              {logo && (
                <div className="mt-3 rounded-xl overflow-hidden border border-[#e8e2dc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt={name || "Foto de la barbería"}
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </Section>

            {/* QR */}
            {org && (
              <Section
                icon={<IconQR />}
                title="QR de reserva"
                description="Imprime y pega en tu barbería para que clientes reserven."
              >
                <div className="flex justify-center pb-2">
                  <QRBooking slug={org.slug} size={160} />
                </div>
                <div className="space-y-2 pt-3 border-t border-[#f0ece8]">
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-1">
                      Landing
                    </p>
                    <p className="text-xs font-mono text-stone-700 break-all">
                      {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-1">
                      Booking directo
                    </p>
                    <p className="text-xs font-mono text-stone-700 break-all">
                      {typeof window !== "undefined" ? window.location.origin : ""}/{org.slug}/book
                    </p>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
