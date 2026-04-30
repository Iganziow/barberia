"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useIsClient } from "@/hooks/use-is-client";

/**
 * Sistema de toasts liviano (sin deps externas). Reemplaza los `alert()`
 * scattered con un mecanismo consistente, accesible (aria-live, role),
 * y que matchea el design system MarBrava.
 *
 * Uso recomendado (API nueva):
 *   const t = useToast();
 *   t.success("Cita creada");
 *   t.error("No se pudo guardar", { description: "Intenta más tarde" });
 *   t.warning("Tu sesión va a expirar", { durationMs: 8000 });
 *
 * Backward-compat (API vieja):
 *   const { toast } = useToast();
 *   toast("Hola");                  → success por default
 *   toast("Error", "error");        → variant via 2do param
 *
 * Setup: ToastProvider va una sola vez en root layout.
 */

type ToastVariant = "success" | "error" | "info" | "warning";

type ToastEntry = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
};

type ToastOptions = {
  description?: string;
  /** ms hasta auto-dismiss. 0 = persistente. Default 4500. */
  durationMs?: number;
};

type ToastApi = {
  // ────── API nueva (preferida) ──────
  success: (title: string, opts?: ToastOptions) => string;
  error: (title: string, opts?: ToastOptions) => string;
  info: (title: string, opts?: ToastOptions) => string;
  warning: (title: string, opts?: ToastOptions) => string;
  show: (input: { variant: ToastVariant; title: string } & ToastOptions) => string;
  dismiss: (id: string) => void;
  // ────── Backward-compat (uso anterior `toast(msg, type)`) ──────
  toast: (message: string, type?: ToastVariant) => string;
};

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (input) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t-${Date.now()}-${Math.random()}`;
      const entry: ToastEntry = {
        id,
        variant: input.variant,
        title: input.title,
        description: input.description,
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      };
      setToasts((prev) => [...prev, entry]);
      if (entry.durationMs > 0) {
        setTimeout(() => dismiss(id), entry.durationMs);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, opts) => show({ variant: "success", title, ...opts }),
      error: (title, opts) => show({ variant: "error", title, ...opts }),
      info: (title, opts) => show({ variant: "info", title, ...opts }),
      warning: (title, opts) => show({ variant: "warning", title, ...opts }),
      toast: (message, type = "success") => show({ variant: type, title: message }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("useToast() called outside ToastProvider");
    }
    const noop = () => "";
    return {
      show: noop,
      dismiss: () => {},
      success: noop,
      error: noop,
      info: noop,
      warning: noop,
      toast: noop,
    };
  }
  return ctx;
}

/* ────── Iconos por variante ────── */

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconError() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const VARIANT_ICON: Record<ToastVariant, React.JSX.Element> = {
  success: <IconCheck />,
  error: <IconError />,
  info: <IconInfo />,
  warning: <IconWarning />,
};

/* ────── Toaster (renderea bottom-right en desktop, bottom-center en mobile) ────── */

function Toaster({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: string) => void }) {
  // Render solo cliente: previene hydration mismatch.
  const mounted = useIsClient();
  if (!mounted) return null;

  return (
    <div className="mb-toaster" role="region" aria-label="Notificaciones" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" || t.variant === "warning" ? "alert" : "status"}
          className={`mb-toast mb-toast--${t.variant}`}
        >
          <span className={`mb-toast__icon mb-toast__icon--${t.variant}`}>
            {VARIANT_ICON[t.variant]}
          </span>
          <div className="mb-toast__body">
            <p className="mb-toast__title">{t.title}</p>
            {t.description && <p className="mb-toast__desc">{t.description}</p>}
          </div>
          <button
            type="button"
            className="mb-toast__close"
            onClick={() => onDismiss(t.id)}
            aria-label="Cerrar notificación"
          >
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  );
}
