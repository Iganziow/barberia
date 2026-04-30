import type { ReactNode } from "react";

/**
 * Estado vacío unificado. Reemplaza los "No hay X" texto-plano que
 * estaban scattered en el código. Estilo coherente con MB design system.
 *
 * Uso:
 *   {clients.length === 0 && (
 *     <EmptyState
 *       icon={<IconUsers />}
 *       title="No hay clientes todavía"
 *       description="Cuando alguien reserve, aparecerá acá."
 *       action={<button onClick={...}>Compartir mi link</button>}
 *     />
 *   )}
 */

type Props = {
  /** SVG icon para mostrar arriba del título. */
  icon?: ReactNode;
  /** Título principal — corto, frase clara. */
  title: string;
  /** Subtítulo opcional explicando qué pasa o sugerencia. */
  description?: string;
  /** Botón/link de acción primaria (opcional). */
  action?: ReactNode;
  /** Variante: card (con borde + bg), inline (sin borde). */
  variant?: "card" | "inline";
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "card",
  className = "",
}: Props) {
  const baseClasses =
    variant === "card"
      ? "rounded-xl border border-dashed border-[#e8e2dc] bg-white px-6 py-10 dark:border-stone-700 dark:bg-stone-900/40"
      : "px-4 py-8";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center text-center ${baseClasses} ${className}`}
    >
      {icon && (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-stone-500 dark:text-stone-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
