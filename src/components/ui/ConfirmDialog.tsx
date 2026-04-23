"use client";

import Modal from "./modal";

/**
 * Diálogo de confirmación reutilizable — reemplaza a window.confirm() con
 * un modal consistente con el resto del UI (misma tipografía, botones,
 * animaciones). Permite variante "danger" para acciones destructivas.
 *
 * Uso típico:
 *   const [confirm, setConfirm] = useState<null | { action: () => void }>(null);
 *   ...
 *   <ConfirmDialog
 *     open={confirm !== null}
 *     title="¿Eliminar sucursal?"
 *     message="Esta acción no se puede deshacer."
 *     confirmLabel="Eliminar"
 *     variant="danger"
 *     onConfirm={() => confirm?.action()}
 *     onClose={() => setConfirm(null)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-stone-600 whitespace-pre-wrap">{message}</p>
    </Modal>
  );
}
