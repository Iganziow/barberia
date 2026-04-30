"use client";

import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { useIsClient } from "@/hooks/use-is-client";

/**
 * Toggle de tema (claro / oscuro / sistema).
 *
 * Variantes:
 *  - "icon"   → solo botón con icono (sun/moon/auto). Compacto.
 *  - "button" → texto + icono (para sidebar expandido).
 *  - "menu"   → dropdown con 3 opciones (más explícito).
 *
 * Por defecto cicla entre los 3 modos al click. Para evitar hydration
 * mismatch, renderea un placeholder hasta que monta en cliente.
 */

type Variant = "icon" | "button" | "menu";

function IconSun({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function IconMoon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
function IconAuto({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12a9 9 0 019 9" />
    </svg>
  );
}

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

function IconForMode({ mode, className }: { mode: ThemeMode; className?: string }) {
  if (mode === "light") return <IconSun className={className} />;
  if (mode === "dark") return <IconMoon className={className} />;
  return <IconAuto className={className} />;
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  // Hasta que montemos en cliente, renderizamos un placeholder estable
  // (mismo tamaño) para evitar hydration mismatch.
  if (!mounted) {
    if (variant === "menu") {
      return <div className={`h-9 w-32 rounded-lg ${className}`} aria-hidden="true" />;
    }
    if (variant === "button") {
      return <div className={`h-9 w-full rounded-lg ${className}`} aria-hidden="true" />;
    }
    return <div className={`h-8 w-8 rounded-lg ${className}`} aria-hidden="true" />;
  }

  const cycle = () => setTheme(NEXT_MODE[theme]);
  const title = `Tema: ${LABEL[theme]} — clic para cambiar`;

  if (variant === "menu") {
    return (
      <div className={`inline-flex items-center gap-0.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 ${className}`}>
        {(["light", "dark", "system"] as ThemeMode[]).map((m) => {
          const active = theme === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setTheme(m)}
              aria-label={`Tema ${LABEL[m]}`}
              aria-pressed={active}
              title={LABEL[m]}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                active
                  ? "bg-brand text-white"
                  : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
              }`}
            >
              <IconForMode mode={m} />
              <span className="hidden sm:inline">{LABEL[m]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={cycle}
        title={title}
        aria-label={title}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition w-full ${className}`}
      >
        <IconForMode mode={theme} className="shrink-0 text-white/30" />
        <span className="whitespace-nowrap">Tema: {LABEL[theme]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition ${className}`}
    >
      <IconForMode mode={theme} />
    </button>
  );
}
