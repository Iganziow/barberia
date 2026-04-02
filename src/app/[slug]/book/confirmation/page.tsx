"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { formatCLP } from "@/lib/format";

type BookingDetail = {
  id: string;
  start: string;
  end: string;
  status: string;
  price: number;
  barberName: string;
  serviceName: string;
  serviceDuration: number;
  clientName: string;
};

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f6] flex items-center justify-center text-stone-400">Cargando...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const id = searchParams.get("id");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/book/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.booking) setBooking(data.booking);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const bookUrl = `/${slug}/book`;

  if (!id && loading) {
    return (
      <div className="min-h-screen bg-[#faf8f6]">
        <header className="bg-[#1a1412] text-white">
          <div className="mx-auto max-w-lg px-4 py-5">
            <h1 className="text-xl font-extrabold tracking-tight">
              Mar<span className="text-[#c87941]">Brava</span>
            </h1>
          </div>
        </header>
        <div className="text-center py-12">
          <p className="text-stone-500">Reserva no encontrada</p>
          <Link href={bookUrl} className="text-[#c87941] text-sm mt-2 inline-block">Volver a reservar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f6]">
      <header className="bg-[#1a1412] text-white">
        <div className="mx-auto max-w-lg px-4 py-5">
          <h1 className="text-xl font-extrabold tracking-tight">
            Mar<span className="text-[#c87941]">Brava</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {loading && <div className="text-center text-stone-400 py-12">Cargando...</div>}

        {!loading && !booking && (
          <div className="text-center py-12">
            <p className="text-stone-500">Reserva no encontrada</p>
            <Link href={bookUrl} className="text-[#c87941] text-sm mt-2 inline-block">Volver a reservar</Link>
          </div>
        )}

        {!loading && booking && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
              <h2 className="mt-4 text-xl font-bold text-stone-900">Reserva confirmada</h2>
              <p className="mt-1 text-sm text-stone-500">Te esperamos, {booking.clientName}</p>
            </div>

            <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg text-stone-900">{booking.serviceName}</p>
                  <p className="text-sm text-stone-500">{booking.serviceDuration} min con {booking.barberName}</p>
                </div>
                <p className="font-bold text-[#c87941]">{formatCLP(booking.price)}</p>
              </div>
              <div className="border-t border-[#e8e2dc] pt-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📅</div>
                  <div>
                    <p className="font-semibold text-stone-900">
                      {new Date(booking.start).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-sm text-stone-500">
                      {new Date(booking.start).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} - {new Date(booking.end).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-stone-400">
              Si necesitas cancelar o cambiar tu hora, contacta directamente a la barbería.
            </p>

            <Link href={bookUrl} className="block w-full text-center rounded-xl border border-[#c87941]/20 bg-white px-4 py-3 text-sm font-medium text-[#c87941] hover:bg-[#c87941]/5 transition">
              Reservar otra hora
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
