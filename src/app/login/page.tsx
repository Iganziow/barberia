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
      const defaultRedirect = data.user?.role === "BARBER" ? "/barber" : "/admin";
      const next = params.get("next") || defaultRedirect;
      router.push(next);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1412] to-[#2a1f18] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#c87941]/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Mar<span className="text-[#c87941]">Brava</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Panel de administración
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#c87941]/15 bg-white/[0.04] p-6 backdrop-blur-sm shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-white mb-6">
            Iniciar sesión
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/25 focus:border-[#c87941] focus:outline-none focus:ring-2 focus:ring-[#c87941]/20"
                placeholder="tu@email.cl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/25 focus:border-[#c87941] focus:outline-none focus:ring-2 focus:ring-[#c87941]/20"
                placeholder="........"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#c87941] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b56a35] focus:outline-none focus:ring-2 focus:ring-[#c87941]/50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-[#c87941]/20"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} MarBrava
        </p>
      </div>
    </div>
  );
}
