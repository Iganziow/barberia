export type TourStep = {
  targetId: string | null; // null = centered (no spotlight)
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
};

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    title: "Bienvenido a MarBrava",
    description: "Te guiaremos por las herramientas principales para gestionar tu barbería. Puedes repetir este tour desde tu perfil.",
    position: "center",
  },
  {
    targetId: "sidebar-nav",
    title: "Menú principal",
    description: "Navega entre Agenda, Barberos, Horarios, Servicios, Clientes y Reportes desde aquí.",
    position: "right",
  },
  {
    targetId: "topbar-stats",
    title: "Resumen del día",
    description: "Aquí ves cuántas citas tienes hoy, la próxima hora y los ingresos del día.",
    position: "bottom",
  },
  {
    targetId: "agenda-filters",
    title: "Filtros rápidos",
    description: "Filtra por sucursal, profesional o estado de la reserva.",
    position: "bottom",
  },
  {
    targetId: "agenda-calendar",
    title: "Tu agenda",
    description: "Haz clic en cualquier horario para crear una reserva o bloqueo. Haz clic en una cita para ver su detalle.",
    position: "top",
  },
  {
    targetId: "new-button",
    title: "Nueva reserva",
    description: "Crea una reserva manual o bloquea un horario desde aquí.",
    position: "bottom",
  },
  {
    targetId: "nav-barberos",
    title: "Gestión de equipo",
    description: "Gestiona tu equipo: asigna qué servicios ofrece cada barbero y configura sus comisiones.",
    position: "right",
  },
  {
    targetId: "nav-horarios",
    title: "Horarios de trabajo",
    description: "Configura cuándo abre tu sucursal y el horario de cada barbero. Esto controla la disponibilidad en el booking.",
    position: "right",
  },
  {
    targetId: "nav-servicios",
    title: "Servicios y precios",
    description: "Define los servicios que ofreces con su precio y duración. Estos aparecen en tu página de reservas.",
    position: "right",
  },
  {
    targetId: "nav-reportes",
    title: "Reportes y liquidaciones",
    description: "Consulta ingresos, citas completadas y cuánto pagarle a cada barbero. Puedes exportar a CSV.",
    position: "right",
  },
];
