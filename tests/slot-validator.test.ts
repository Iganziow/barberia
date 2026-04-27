import { describe, it, expect } from "vitest";
import {
  slotConflictMessage,
  validateAppointmentSlot,
} from "@/lib/services/availability.service";

/**
 * Tests del validador centralizado de slots. Los tests de mensaje son
 * puros. Los tests de validación usan un fake Prisma in-memory para no
 * depender de DB.
 */

describe("slotConflictMessage", () => {
  it("returns clear message for barber off", () => {
    expect(slotConflictMessage({ kind: "barber_off" })).toMatch(/no trabaja/i);
  });

  it("returns clear message for closed branch", () => {
    expect(slotConflictMessage({ kind: "branch_closed" })).toMatch(/cerrada/i);
  });

  it("includes work hours in outside_schedule message", () => {
    const msg = slotConflictMessage({
      kind: "outside_schedule",
      workStart: "09:00",
      workEnd: "18:00",
    });
    expect(msg).toContain("09:00");
    expect(msg).toContain("18:00");
  });

  it("returns clear message for appointment overlap", () => {
    expect(
      slotConflictMessage({ kind: "appointment_overlap", appointmentId: "a1" })
    ).toMatch(/otra cita/i);
  });

  it("returns clear message for block overlap", () => {
    expect(slotConflictMessage({ kind: "block_overlap", blockId: "b1" })).toMatch(
      /bloqueado/i
    );
  });
});

/** Fake Prisma para tests sin DB. Soporta los métodos que toca el validador. */
type FakeBarberSchedule = {
  barberId: string;
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
};
type FakeWorkingHours = {
  branchId: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};
type FakeAppointment = {
  id: string;
  barberId: string;
  status: string;
  start: Date;
  end: Date;
};
type FakeBlock = { id: string; barberId: string; start: Date; end: Date };

function makeFakePrisma(opts: {
  schedules?: FakeBarberSchedule[];
  hours?: FakeWorkingHours[];
  appointments?: FakeAppointment[];
  blocks?: FakeBlock[];
}) {
  const schedules = opts.schedules ?? [];
  const hours = opts.hours ?? [];
  const appointments = opts.appointments ?? [];
  const blocks = opts.blocks ?? [];

  return {
    barberSchedule: {
      findUnique: ({ where }: { where: { barberId_dayOfWeek: { barberId: string; dayOfWeek: number } } }) => {
        const { barberId, dayOfWeek } = where.barberId_dayOfWeek;
        return Promise.resolve(
          schedules.find((s) => s.barberId === barberId && s.dayOfWeek === dayOfWeek) ?? null
        );
      },
    },
    workingHours: {
      findUnique: ({ where }: { where: { branchId_dayOfWeek: { branchId: string; dayOfWeek: number } } }) => {
        const { branchId, dayOfWeek } = where.branchId_dayOfWeek;
        return Promise.resolve(
          hours.find((h) => h.branchId === branchId && h.dayOfWeek === dayOfWeek) ?? null
        );
      },
    },
    appointment: {
      findFirst: ({ where }: {
        where: {
          barberId: string;
          id?: { not: string };
          status: { notIn: string[] };
          start: { lt: Date };
          end: { gt: Date };
        };
      }) => {
        const found = appointments.find(
          (a) =>
            a.barberId === where.barberId &&
            !where.status.notIn.includes(a.status) &&
            a.start < where.start.lt &&
            a.end > where.end.gt &&
            (!where.id?.not || a.id !== where.id.not)
        );
        return Promise.resolve(found ? { id: found.id } : null);
      },
    },
    blockTime: {
      findFirst: ({ where }: {
        where: { barberId: string; start: { lt: Date }; end: { gt: Date } };
      }) => {
        const found = blocks.find(
          (b) =>
            b.barberId === where.barberId &&
            b.start < where.start.lt &&
            b.end > where.end.gt
        );
        return Promise.resolve(found ? { id: found.id } : null);
      },
    },
  };
}

describe("validateAppointmentSlot", () => {
  // Lunes 27 abril 2026 — un futuro garantizado para tests deterministas.
  const MONDAY_10AM = new Date("2026-04-27T10:00:00");
  const MONDAY_1030AM = new Date("2026-04-27T10:30:00");
  const MONDAY = MONDAY_10AM.getDay(); // 1

  const baseSchedule: FakeBarberSchedule = {
    barberId: "b1",
    dayOfWeek: MONDAY,
    isWorking: true,
    startTime: "09:00",
    endTime: "18:00",
  };
  const baseHours: FakeWorkingHours = {
    branchId: "br1",
    dayOfWeek: MONDAY,
    isOpen: true,
    openTime: "08:00",
    closeTime: "20:00",
  };

  it("returns null for a valid slot", async () => {
    const fp = makeFakePrisma({ schedules: [baseSchedule], hours: [baseHours] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result).toBeNull();
  });

  it("rejects when barber is off that day", async () => {
    const fp = makeFakePrisma({
      schedules: [{ ...baseSchedule, isWorking: false }],
      hours: [baseHours],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result?.kind).toBe("barber_off");
  });

  it("rejects when branch is closed that day", async () => {
    const fp = makeFakePrisma({
      schedules: [baseSchedule],
      hours: [{ ...baseHours, isOpen: false }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result?.kind).toBe("branch_closed");
  });

  it("rejects slot before barber's start time", async () => {
    const fp = makeFakePrisma({ schedules: [baseSchedule], hours: [baseHours] });
    // 08:30 — antes de las 09:00 del barbero
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: new Date("2026-04-27T08:30:00"),
      end: new Date("2026-04-27T09:00:00"),
    }, { rejectPast: false });
    expect(result?.kind).toBe("outside_schedule");
  });

  it("rejects slot ending after barber's end time", async () => {
    const fp = makeFakePrisma({ schedules: [baseSchedule], hours: [baseHours] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: new Date("2026-04-27T17:45:00"),
      end: new Date("2026-04-27T18:30:00"),
    }, { rejectPast: false });
    expect(result?.kind).toBe("outside_schedule");
  });

  it("rejects slot overlapping existing appointment", async () => {
    const fp = makeFakePrisma({
      schedules: [baseSchedule],
      hours: [baseHours],
      appointments: [
        {
          id: "a1",
          barberId: "b1",
          status: "RESERVED",
          start: new Date("2026-04-27T10:15:00"),
          end: new Date("2026-04-27T10:45:00"),
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result?.kind).toBe("appointment_overlap");
  });

  it("ignores canceled appointments in overlap check", async () => {
    const fp = makeFakePrisma({
      schedules: [baseSchedule],
      hours: [baseHours],
      appointments: [
        {
          id: "a1",
          barberId: "b1",
          status: "CANCELED",
          start: new Date("2026-04-27T10:00:00"),
          end: new Date("2026-04-27T10:30:00"),
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result).toBeNull();
  });

  it("excludes the same appointment when rescheduling", async () => {
    const fp = makeFakePrisma({
      schedules: [baseSchedule],
      hours: [baseHours],
      appointments: [
        {
          id: "self",
          barberId: "b1",
          status: "RESERVED",
          start: MONDAY_10AM,
          end: MONDAY_1030AM,
        },
      ],
    });
    // Misma franja pero excluyendo la cita "self" → no debería marcar overlap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { excludeAppointmentId: "self", rejectPast: false });
    expect(result).toBeNull();
  });

  it("rejects slot overlapping a block time", async () => {
    const fp = makeFakePrisma({
      schedules: [baseSchedule],
      hours: [baseHours],
      blocks: [
        {
          id: "blk1",
          barberId: "b1",
          start: new Date("2026-04-27T09:30:00"),
          end: new Date("2026-04-27T10:30:00"),
        },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateAppointmentSlot(fp as any, {
      barberId: "b1",
      branchId: "br1",
      start: MONDAY_10AM,
      end: MONDAY_1030AM,
    }, { rejectPast: false });
    expect(result?.kind).toBe("block_overlap");
  });
});
