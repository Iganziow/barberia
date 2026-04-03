"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not dismissed before
      const dismissed = localStorage.getItem("marbrava_pwa_dismissed");
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem("marbrava_pwa_dismissed", "1");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-[#e8e2dc] bg-white p-4 shadow-xl sm:left-auto sm:right-4 sm:max-w-xs">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1a1412]">
          <span className="text-xs font-extrabold text-white">M<span className="text-brand">B</span></span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800">Instalar MarBrava</p>
          <p className="text-xs text-stone-500 mt-0.5">Accede desde tu pantalla de inicio</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-lg border border-[#e8e2dc] py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition"
        >
          Ahora no
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 rounded-lg bg-brand py-2 text-xs font-bold text-white hover:bg-brand-hover transition"
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
