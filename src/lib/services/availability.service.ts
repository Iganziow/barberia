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
 *
 * Implementado con batch fetches para evitar N+1:
 * - 1 query para barberos
 * - 1 query para horarios de todos los barberos ese día
 * - 1 query para working hours de la sucursal
 * - 1 query para appointments de todos los barberos ese día
 * - 1 query para blocks de todos los barberos ese día
 *
 * Antes hacía 4*N queries (una llamada a getAvailableSlots por barbero).
 */
export async function getBarbersWithAvailability(
  branchId: string,
  date: string,
  durationMin: number
) {
  const dayDate = new Date(date + "T00:00:00");
  const dayOfWeek = dayDate.getDay();
  const dayStart = dayDate;
  const dayEnd = new Date(date + "T23:59:59");
  const nowMs = Date.now();

  const barbers = await prisma.barber.findMany({
    where: { branchId, active: true },
    select: {
      id: true,
      color: true,
      user: { select: { name: true } },
    },
  });
  if (barbers.length === 0) return [];

  const barberIds = barbers.map((b) => b.id);

  const [barberSchedules, branchHours, appointments, blocks] = await Promise.all([
    prisma.barberSchedule.findMany({
      where: { barberId: { in: barberIds }, dayOfWeek },
    }),
    prisma.workingHours.findUnique({
      where: { branchId_dayOfWeek: { branchId, dayOfWeek } },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        start: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { barberId: true, start: true, end: true },
    }),
    prisma.blockTime.findMany({
      where: {
        barberId: { in: barberIds },
        start: { lte: dayEnd },
        end: { gte: dayStart },
      },
      select: { barberId: true, start: true, end: true },
    }),
  ]);

  if (!branchHours || !branchHours.isOpen) {
    // Sucursal cerrada: todos tienen 0 slots
    return barbers.map((b) => ({
      id: b.id,
      name: b.user.name,
      color: b.color,
      availableSlots: 0,
    }));
  }

  const scheduleByBarber = new Map<string, typeof barberSchedules[0]>();
  for (const s of barberSchedules) {
    scheduleByBarber.set(s.barberId, s);
  }

  const slotStep = 30;

  return barbers.map((b) => {
    const sched = scheduleByBarber.get(b.id);
    if (!sched || !sched.isWorking) {
      return { id: b.id, name: b.user.name, color: b.color, availableSlots: 0 };
    }
    const workStart = laterTime(sched.startTime, branchHours.openTime);
    const workEnd = earlierTime(sched.endTime, branchHours.closeTime);

    const [startH, startM] = workStart.split(":").map(Number);
    const [endH, endM] = workEnd.split(":").map(Number);

    const windowStart = new Date(dayDate);
    windowStart.setHours(startH, startM, 0, 0);
    const windowEnd = new Date(dayDate);
    windowEnd.setHours(endH, endM, 0, 0);

    const busy: Array<{ start: number; end: number }> = [];
    for (const a of appointments) {
      if (a.barberId === b.id) busy.push({ start: a.start.getTime(), end: a.end.getTime() });
    }
    for (const blk of blocks) {
      if (blk.barberId === b.id) busy.push({ start: blk.start.getTime(), end: blk.end.getTime() });
    }

    let available = 0;
    let cursor = windowStart.getTime();
    while (cursor + durationMin * 60_000 <= windowEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMin * 60_000;
      // Filtrar past slots si es hoy
      if (slotStart > nowMs) {
        const conflicts = busy.some((bu) => slotStart < bu.end && bu.start < slotEnd);
        if (!conflicts) available++;
      }
      cursor += slotStep * 60_000;
    }

    return {
      id: b.id,
      name: b.user.name,
      color: b.color,
      availableSlots: available,
    };
  });
}

export type HeatmapDay = {
  date: string;
  totalSlots: number;
  availableSlots: number;
  level: "high" | "medium" | "low" | "full" | "closed";
  waitlistCount: number;
};

/**
 * Get availability heatmap for a branch across multiple days.
 * Returns slot counts and availability level per day.
 */
export async function getAvailabilityHeatmap(
  branchId: string,
  serviceId: string,
  days: number = 14
): Promise<HeatmapDay[]> {
  // Get service duration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMin: true },
  });
  if (!service) return [];

  // Get all active barbers in this branch
  const barbers = await prisma.barber.findMany({
    where: { branchId, active: true },
    select: { id: true },
  });
  if (barbers.length === 0) return [];

  const barberIds = barbers.map((b) => b.id);

  // Generate date range
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Batch fetch: all schedules, working hours, appointments, blocks for the range
  const rangeStart = new Date(dates[0] + "T00:00:00");
  const rangeEnd = new Date(dates[dates.length - 1] + "T23:59:59");

  const [barberSchedules, branchHours, appointments, blocks, waitlistCounts] = await Promise.all([
    prisma.barberSchedule.findMany({
      where: { barberId: { in: barberIds } },
    }),
    prisma.workingHours.findMany({
      where: { branchId },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        start: { gte: rangeStart, lte: rangeEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { barberId: true, start: true, end: true },
    }),
    prisma.blockTime.findMany({
      where: {
        barberId: { in: barberIds },
        start: { lte: rangeEnd },
        end: { gte: rangeStart },
      },
      select: { barberId: true, start: true, end: true },
    }),
    prisma.waitlist.groupBy({
      by: ["preferredDate"],
      where: {
        branchId,
        serviceId,
        status: "ACTIVE",
        preferredDate: { in: dates },
      },
      _count: true,
    }),
  ]);

  // Index data for fast lookup
  const scheduleMap = new Map<string, typeof barberSchedules[0]>();
  for (const s of barberSchedules) {
    scheduleMap.set(`${s.barberId}_${s.dayOfWeek}`, s);
  }

  const hoursMap = new Map<number, typeof branchHours[0]>();
  for (const h of branchHours) {
    hoursMap.set(h.dayOfWeek, h);
  }

  const waitlistMap = new Map<string, number>();
  for (const w of waitlistCounts) {
    waitlistMap.set(w.preferredDate, w._count);
  }

  const durationMin = service.durationMin;
  const slotStep = 30;
  const nowMs = Date.now();

  // Calculate per day
  const result: HeatmapDay[] = dates.map((date) => {
    const dayDate = new Date(date + "T00:00:00");
    const dayOfWeek = dayDate.getDay();
    const dayStart = dayDate.getTime();
    const dayEnd = new Date(date + "T23:59:59").getTime();

    const branchDay = hoursMap.get(dayOfWeek);
    if (!branchDay || !branchDay.isOpen) {
      return { date, totalSlots: 0, availableSlots: 0, level: "closed" as const, waitlistCount: waitlistMap.get(date) ?? 0 };
    }

    let totalSlots = 0;
    let availableSlots = 0;

    for (const barberId of barberIds) {
      const sched = scheduleMap.get(`${barberId}_${dayOfWeek}`);
      if (!sched || !sched.isWorking) continue;

      const workStart = laterTime(sched.startTime, branchDay.openTime);
      const workEnd = earlierTime(sched.endTime, branchDay.closeTime);

      const [startH, startM] = workStart.split(":").map(Number);
      const [endH, endM] = workEnd.split(":").map(Number);

      const windowStart = new Date(dayDate);
      windowStart.setHours(startH, startM, 0, 0);
      const windowEnd = new Date(dayDate);
      windowEnd.setHours(endH, endM, 0, 0);

      // Get busy intervals for this barber on this day
      const busy = [
        ...appointments
          .filter((a) => a.barberId === barberId && a.start.getTime() >= dayStart && a.start.getTime() <= dayEnd)
          .map((a) => ({ start: a.start.getTime(), end: a.end.getTime() })),
        ...blocks
          .filter((b) => b.barberId === barberId && b.start.getTime() <= dayEnd && b.end.getTime() >= dayStart)
          .map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
      ];

      let cursor = windowStart.getTime();
      while (cursor + durationMin * 60_000 <= windowEnd.getTime()) {
        const slotStart = cursor;
        const slotEnd = cursor + durationMin * 60_000;

        // Skip past slots for today
        if (slotStart > nowMs || date !== dates[0]) {
          totalSlots++;
          const conflicts = busy.some((b) => slotStart < b.end && b.start < slotEnd);
          if (!conflicts) availableSlots++;
        }

        cursor += slotStep * 60_000;
      }
    }

    const ratio = totalSlots > 0 ? availableSlots / totalSlots : 0;
    const level: HeatmapDay["level"] =
      totalSlots === 0 ? "closed"
        : availableSlots === 0 ? "full"
          : ratio > 0.6 ? "high"
            : ratio > 0.3 ? "medium"
              : "low";

    return { date, totalSlots, availableSlots, level, waitlistCount: waitlistMap.get(date) ?? 0 };
  });

  return result;
}
