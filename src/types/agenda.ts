// Tipos compartidos para el frontend — desacoplados de @prisma/client

export type BarberOption = {
  id: string;
  name: string;
  color: string | null;
};

export type ServiceOption = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

export type BranchOption = {
  id: string;
  name: string;
};

export type AppointmentView = {
  id: string;
  start: string; // ISO
  end: string; // ISO
  status: string;
  price: number;
  notePublic: string | null;
  noteInternal: string | null;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  clientName: string;
};

export type BlockTimeView = {
  id: string;
  reason: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  barberId: string;
  barberName: string;
};

// Los 7 estados canónicos del enum AppointmentStatus (prisma/schema.prisma).
export type AppointmentStatusCode =
  | "RESERVED"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELED"
  | "NO_SHOW";

// Tipo unificado para el calendario (appointments + blocks + bloques "no disponible").
export type AgendaEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  kind: "APPOINTMENT" | "BLOCK" | "UNAVAILABLE";
  barberId: string;
  /**
   * Para APPOINTMENT: el status canónico del Appointment.
   * Para BLOCK / UNAVAILABLE: se fija en "ACTIVE" (solo usado para filtros).
   */
  status: AppointmentStatusCode | "ACTIVE";
  /** true si la cita tiene un pago registrado (solo para APPOINTMENT). */
  paid?: boolean;
  /** Nombre del servicio (para tooltip). */
  serviceName?: string;
};

// Horario de trabajo de un barbero para un día de la semana (espejo de BarberSchedule).
export type BarberScheduleEntry = {
  barberId: string;
  dayOfWeek: number; // 0 = domingo, 6 = sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isWorking: boolean;
};

// Rango horario visible del calendario (seleccionable por el admin, persistido en localStorage).
export type VisibleRange = {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
};

// Preset de filtro de estado.
export type StatusPreset = "ACTIVE" | "HISTORY" | "ALL" | "CUSTOM";

export type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};
