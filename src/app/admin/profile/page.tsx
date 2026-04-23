"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTour } from "@/hooks/use-tour";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";

// ─── Icons ──────────────────────────────────────────────────────────────
function IconShield() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22c0-4 3-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconTour() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 10h.01M15 10h.01M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7L12 13 2 7" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

// ─── Indicador de fuerza de contraseña ──────────────────────────────────
// Heurística simple: longitud + variedad de caracteres. No pretende
// reemplazar zxcvbn, solo dar feedback visual al usuario.
function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-stone-200" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const s = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const meta: Record<number, { label: string; color: string }> = {
    0: { label: "Muy débil", color: "bg-red-400" },
    1: { label: "Débil", color: "bg-red-400" },
    2: { label: "Aceptable", color: "bg-amber-400" },
    3: { label: "Buena", color: "bg-emerald-400" },
    4: { label: "Muy buena", color: "bg-emerald-500" },
  };
  return { score: s, ...meta[s] };
}

// ─── Componente principal ───────────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading } = useAuthUser();
  const { restart } = useTour();

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const strength = useMemo(() => passwordStrength(pwForm.newPassword), [pwForm.newPassword]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Las contraseñas no coinciden");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error" }));
        setPwError(err.message || "No se pudo cambiar la contraseña");
        return;
      }
      setPwSuccess(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch {
      setPwError("Error de conexión");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Mi Perfil</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Tu información de cuenta y seguridad
          </p>
        </div>
        <UserAvatarBadge />
      </div>

      {/* ── Loading state ─────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-4xl">
          <div className="lg:col-span-2 h-60 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="h-60 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="lg:col-span-3 h-80 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {!loading && !user && (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center max-w-xl">
          <p className="text-sm font-bold text-red-800">No se pudo cargar tu perfil</p>
          <p className="text-xs text-red-600 mt-1">Revisa tu sesión o recarga la página.</p>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────── */}
      {!loading && user && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
          {/* ── Identidad ──────────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-[#e8e2dc]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
                <IconUser />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-stone-900">Identidad</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tu información pública y de contacto
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-brand text-xl font-extrabold text-white shadow-sm shadow-brand/30">
                  {user.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-stone-900 truncate">{user.name}</h3>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#f0ece8]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 flex items-center gap-1.5">
                    <IconMail /> Email
                  </p>
                  <p className="text-sm font-medium text-stone-900 break-all">{user.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 flex items-center gap-1.5">
                    <IconPhone /> Teléfono
                  </p>
                  <p className="text-sm font-medium text-stone-900">
                    {user.phone || <span className="text-stone-400 italic font-normal">No registrado</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ayuda / Tour ──────────────────────────────────── */}
          <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-[#e8e2dc]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
                <IconTour />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-stone-900">Ayuda</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tour de bienvenida
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm text-stone-600 mb-4 leading-snug">
                Si necesitas recordar cómo funciona la aplicación, puedes repetir el tour que te mostramos la primera vez.
              </p>
              <button
                onClick={() => {
                  restart();
                  window.location.href = "/admin";
                }}
                className="w-full rounded-lg border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 hover:border-brand/40 transition"
              >
                Repetir tour de bienvenida
              </button>
            </div>
          </div>

          {/* ── Seguridad (cambio de contraseña) ──────────────── */}
          <div className="lg:col-span-3 rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-[#e8e2dc]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
                <IconShield />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-stone-900">Seguridad</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Cambia tu contraseña. Te recomendamos mínimo 12 caracteres mezclando letras, números y símbolos.
                </p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 sm:p-6 space-y-4 max-w-2xl">
              <div>
                <label className="field-label">Contraseña actual</label>
                <input
                  type="password"
                  className="input-field"
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Nueva contraseña</label>
                  <input
                    type="password"
                    className="input-field"
                    value={pwForm.newPassword}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  {/* Strength meter */}
                  {pwForm.newPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition ${
                              i < strength.score ? strength.color : "bg-stone-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider w-20 text-right ${
                        strength.score >= 3
                          ? "text-emerald-600"
                          : strength.score >= 2
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    className="input-field"
                    value={pwForm.confirmPassword}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                    <p className="mt-1.5 text-[11px] text-red-600">Las contraseñas no coinciden</p>
                  )}
                </div>
              </div>

              {pwError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-medium">
                  ✓ Contraseña actualizada correctamente
                </div>
              )}

              <div className="pt-2 border-t border-[#f0ece8] flex items-center gap-3 flex-wrap">
                <button
                  type="submit"
                  disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwSaving ? "Guardando..." : "Cambiar contraseña"}
                </button>
                <p className="text-xs text-stone-500">
                  Máx. 5 cambios por hora por seguridad
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
