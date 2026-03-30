import Link from "next/link";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-[#1a1412] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Mar<span className="text-[#c87941]">Brava</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">Sistema de reservas para barberías</p>
        <div className="mt-8 space-y-3">
          <Link
            href="/mi-barberia"
            className="block rounded-xl bg-[#c87941] px-8 py-3 text-sm font-semibold text-white hover:bg-[#b56a35] transition"
          >
            Ir a MarBrava
          </Link>
          <Link
            href="/login"
            className="block text-sm text-white/40 hover:text-white/70 transition"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
