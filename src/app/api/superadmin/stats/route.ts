import { NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = withSuperAdmin(async () => {
  const [orgCount, userCount, barberCount, appointmentCount, revenue] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.barber.count({ where: { active: true } }),
    prisma.appointment.count(),
    prisma.appointment.aggregate({ where: { status: "DONE" }, _sum: { price: true } }),
  ]);

  return NextResponse.json({
    stats: {
      organizations: orgCount,
      users: userCount,
      activeBarbers: barberCount,
      totalAppointments: appointmentCount,
      totalRevenue: revenue._sum.price ?? 0,
    },
  });
});
