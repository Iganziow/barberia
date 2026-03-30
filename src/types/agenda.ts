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

// Tipo unificado para el calendario (appointments + blocks)
export type AgendaEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "APPOINTMENT" | "BLOCK";
  barberId: string;
  status: "ACTIVE" | "CANCELED" | "DONE";
};

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
