import { prisma } from "@/lib/prisma";

type Slot = {
  start: string; // ISO
  end: string; // ISO
};

/**
 * Get available time slots for a barber on a specific date.
 * Logic: barber schedule - existing appointments - block times = available slots
 */
export async function getAvailableSlots(
  barberId: string,
  date: string, // YYYY-MM-DD
  durationMin: number
): Promise<Slot[]> {
  const dayDate = new Date(date + "T00:00:00");
  const dayOfWeek = dayDate.getDay(); // 0=Sunday

  // 1. Get barber's schedule for this day of week
  const schedule = await prisma.barberSchedule.findUnique({
    where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
  });

  if (!schedule || !schedule.isWorking) return [];

  // 2. Get branch working hours for this day
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { branchId: true },
  });
  if (!barber) return [];

  const branchHours = await prisma.workingHours.findUnique({
    where: { branchId_dayOfWeek: { branchId: barber.branchId, dayOfWeek } },
  });

  if (!branchHours || !branchHours.isOpen) return [];

  // 3. Determine working window (intersection of barber schedule and branch hours)
  const workStart = laterTime(schedule.startTime, branchHours.openTime);
  const workEnd = earlierTime(schedule.endTime, branchHours.closeTime);

  // 4. Get existing appointments and blocks for this barber on this date
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId,
        start: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { start: true, end: true },
    }),
    prisma.blockTime.findMany({
      where: {
        barberId,
        start: { lte: dayEnd },
        end: { gte: dayStart },
      },
      select: { start: true, end: true },
    }),
  ]);

  // 5. Build busy intervals
  const busy = [
    ...appointments.map((a) => ({
      start: a.start.getTime(),
      end: a.end.getTime(),
    })),
    ...blocks.map((b) => ({
      start: b.start.getTime(),
      end: b.end.getTime(),
    })),
  ].sort((a, b) => a.start - b.start);

  // 6. Generate slots at 30-min intervals within the working window
  const slots: Slot[] = [];
  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);

  const windowStart = new Date(dayDate);
  windowStart.setHours(startH, startM, 0, 0);
  const windowEnd = new Date(dayDate);
  windowEnd.setHours(endH, endM, 0, 0);

  const slotStep = 30; // minutes
  let cursor = windowStart.getTime();

  while (cursor + durationMin * 60_000 <= windowEnd.getTime()) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMin * 60_000;

    // Check if this slot conflicts with any busy interval
    const conflicts = busy.some(
      (b) => slotStart < b.end && b.start < slotEnd
    );

    if (!conflicts) {
      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
      });
    }

    cursor += slotStep * 60_000;
  }

  // 7. Filter out past slots if date is today
  const now = Date.now();
  return slots.filter((s) => new Date(s.start).getTime() > now);
}

function laterTime(a: string, b: string): string {
  return a > b ? a : b;
}

function earlierTime(a: string, b: string): string {
  return a < b ? a : b;
}

/**
 * Get all barbers with availability status for a given date and service duration.
 */
export async function getBarbersWithAvailability(
  branchId: string,
  date: string,
  durationMin: number
) {
  const barbers = await prisma.barber.findMany({
    where: { branchId, active: true },
    include: { user: { select: { name: true } } },
  });

  const result = await Promise.all(
    barbers.map(async (b) => {
      const slots = await getAvailableSlots(b.id, date, durationMin);
      return {
        id: b.id,
        name: b.user.name,
        color: b.color,
        availableSlots: slots.length,
      };
    })
  );

  return result;
}
