"use client";

import { useState } from "react";

function getKey(id: string) {
  return `marbrava_seen_${id}`;
}

export default function PageTip({ id, text }: { id: string; text: string }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(getKey(id));
  });

  function dismiss() {
    localStorage.setItem(getKey(id), "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
      <span className="mt-0.5 text-brand text-lg leading-none shrink-0">💡</span>
      <p className="flex-1 text-sm text-stone-600 leading-relaxed">{text}</p>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
        aria-label="Cerrar consejo"
      >
        Entendido
      </button>
    </div>
  );
}
