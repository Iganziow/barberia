"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRBooking({ slug, size = 180 }: { slug: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${slug}/book`
    : "";

  useEffect(() => {
    if (!bookingUrl) return;
    QRCode.toDataURL(bookingUrl, {
      width: size,
      margin: 1,
      color: { dark: "#1a1412", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => {});
  }, [bookingUrl, size]);

  if (!qrDataUrl) return null;

  return (
    <div className="rounded-xl border border-[#e8e2dc] bg-white p-4 text-center shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="QR de reserva" className="mx-auto rounded-lg" width={size} height={size} />
      <p className="mt-2 text-xs font-medium text-stone-500">Escanea para reservar</p>
      <p className="text-[10px] text-stone-400 mt-0.5 break-all">{bookingUrl}</p>
      <button
        onClick={() => {
          navigator.clipboard.writeText(bookingUrl);
        }}
        className="mt-2 rounded-lg border border-[#e8e2dc] px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50 transition"
      >
        Copiar link
      </button>
    </div>
  );
}
