import { prisma } from "@/lib/prisma";

/**
 * Devuelve los BarberSchedule de todos los barberos activos de una sucursal.
 * Usado por la agenda para calcular los bloques "Profesional no disponible".
 */
export async function listByBranch(orgId: string, branchId: string) {
  const barbers = await prisma.barber.findMany({
    where: {
      active: true,
      branchId,
      branch: { orgId },
    },
    select: {
      id: true,
      barberSchedules: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isWorking: true,
        },
      },
    },
  });

  return barbers.flatMap((b) =>
    b.barberSchedules.map((s) => ({
      barberId: b.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isWorking: s.isWorking,
    }))
  );
}
