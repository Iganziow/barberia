"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useTour } from "@/hooks/use-tour";

export default function ProfilePage() {
  const { user, loading } = useAuthUser();
  const { restart } = useTour();

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Cargando...</div>;
  }

  if (!user) {
    return <div className="text-center py-20 text-stone-500">No se pudo cargar el perfil</div>;
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Mi Perfil</h1>
        <p className="text-sm text-stone-500">Tu información de cuenta</p>
      </div>

      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{user.name}</h2>
            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-4 border-t border-[#e8e2dc] pt-5">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Email</label>
            <p className="text-sm text-stone-800">{user.email}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Teléfono</label>
            <p className="text-sm text-stone-800">{user.phone || "No registrado"}</p>
          </div>
        </div>
      </div>

      {/* Ayuda */}
      <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm">
        <h3 className="font-bold text-stone-900 mb-3">Ayuda</h3>
        <p className="text-sm text-stone-500 mb-4">
          Si necesitas recordar cómo funciona la aplicación, puedes repetir el tour de bienvenida.
        </p>
        <button
          onClick={() => {
            restart();
            window.location.href = "/admin";
          }}
          className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand/10 transition"
        >
          Repetir tour de bienvenida
        </button>
      </div>

    </div>
  );
}
