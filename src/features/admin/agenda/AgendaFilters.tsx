"use client";

export default function AgendaFilters({
  branchId,
  barberId,
  status,
  onChangeBranch,
  onChangeBarber,
  onChangeStatus,
}: {
  branchId: string;
  barberId: string;
  status: "ACTIVE" | "ALL";
  onChangeBranch: (v: string) => void;
  onChangeBarber: (v: string) => void;
  onChangeStatus: (v: "ACTIVE" | "ALL") => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Sucursal</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={branchId}
          onChange={(e) => onChangeBranch(e.target.value)}
        >
          <option value="branch-1">daniel Silva</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Profesional <span className="text-gray-400">ⓘ</span>
        </label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={barberId}
          onChange={(e) => onChangeBarber(e.target.value)}
        >
          <option value="barber-1">daniel Silva</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Estado de la reserva</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={status}
          onChange={(e) => onChangeStatus(e.target.value as "ACTIVE" | "ALL")}
        >
          <option value="ACTIVE">Reservas activas</option>
          <option value="ALL">Todas</option>
        </select>
      </div>

      <div className="pt-2">
        <button className="w-full border rounded-md px-3 py-2 hover:bg-gray-50 text-sm">
          🔎 Búsqueda rápida de hora
        </button>
      </div>
    </div>
  );
}
