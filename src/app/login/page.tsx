"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const role = data.user?.role;
      const defaultRedirect = role === "SUPERADMIN" ? "/superadmin" : role === "BARBER" ? "/barber" : "/admin";
      const next = params.get("next") || defaultRedirect;
      router.push(next);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen ink-gradient-diagonal flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative glow — cobre brillante */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[color:var(--brand-bright)]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-cream">
            Mar<span className="text-brand-bright-gold">Brava</span>
          </h1>
          <p className="mt-2 text-sm text-cream-muted">
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[color:var(--brand-bright)]/20 bg-white/[0.04] p-6 backdrop-blur-sm shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-cream mb-6">
            Iniciar sesión
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cream-muted mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-cream placeholder:text-cream-subtle focus:border-[color:var(--brand-bright)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-bright)]/25"
                placeholder="tu@email.cl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cream-muted mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-cream placeholder:text-cream-subtle focus:border-[color:var(--brand-bright)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-bright)]/25"
                placeholder="........"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-brand-bright px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-bright)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-cta"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-cream-subtle">
          &copy; {new Date().getFullYear()} MarBrava
        </p>
      </div>
    </div>
  );
}
