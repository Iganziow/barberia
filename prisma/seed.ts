import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Admin1234!", 10);
  const barberHash = await bcrypt.hash("Barber1234!", 10);
  const clientHash = await bcrypt.hash("Client1234!", 10);

  // ─── Admin ────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@barberia.cl" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@barberia.cl",
      password: hash,
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin creado:", admin.email);

  // ─── Organization ─────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "mi-barberia" },
    update: {},
    create: {
      name: "Mi Barbería",
      slug: "mi-barberia",
      phone: "+56912345678",
      email: "contacto@mibarberia.cl",
    },
  });
  console.log("✅ Organización creada:", org.name);

  // Link admin to org
  await prisma.user.update({
    where: { id: admin.id },
    data: { orgId: org.id },
  });

  // ─── Branch ───────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: "branch-sede-central" },
    update: {},
    create: {
      id: "branch-sede-central",
      name: "Sede Central",
      address: "Av. Providencia 1234, Santiago",
      phone: "+56922334455",
      orgId: org.id,
    },
  });
  console.log("✅ Sucursal creada:", branch.name);

  // ─── Working Hours (Lunes a Sábado 09:00-20:00) ──────
  const days = [
    { dayOfWeek: 1, isOpen: true },
    { dayOfWeek: 2, isOpen: true },
    { dayOfWeek: 3, isOpen: true },
    { dayOfWeek: 4, isOpen: true },
    { dayOfWeek: 5, isOpen: true },
    { dayOfWeek: 6, isOpen: true },
    { dayOfWeek: 0, isOpen: false },
  ];

  for (const day of days) {
    await prisma.workingHours.upsert({
      where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: day.dayOfWeek } },
      update: {},
      create: {
        branchId: branch.id,
        dayOfWeek: day.dayOfWeek,
        openTime: "09:00",
        closeTime: "20:00",
        isOpen: day.isOpen,
      },
    });
  }
  console.log("✅ Horarios de atención creados");

  // ─── Service Categories (idempotent) ──────────────────
  let catCorte = await prisma.serviceCategory.findFirst({
    where: { name: "Corte", orgId: org.id },
  });
  if (!catCorte) {
    catCorte = await prisma.serviceCategory.create({
      data: { name: "Corte", order: 1, orgId: org.id },
    });
  }

  let catBarba = await prisma.serviceCategory.findFirst({
    where: { name: "Barba", orgId: org.id },
  });
  if (!catBarba) {
    catBarba = await prisma.serviceCategory.create({
      data: { name: "Barba", order: 2, orgId: org.id },
    });
  }
  console.log("✅ Categorías de servicio creadas");

  // ─── Services (idempotent) ────────────────────────────
  async function upsertService(
    name: string,
    durationMin: number,
    price: number,
    categoryId: string,
    order: number
  ) {
    let svc = await prisma.service.findFirst({
      where: { name, orgId: org.id },
    });
    if (!svc) {
      svc = await prisma.service.create({
        data: { name, durationMin, price, categoryId, orgId: org.id, order },
      });
    }
    return svc;
  }

  const svcCorteClasico = await upsertService("Corte Clásico", 45, 12000, catCorte.id, 1);
  const svcCorteDiseno = await upsertService("Corte + Diseño", 60, 15000, catCorte.id, 2);
  const svcBarba = await upsertService("Barba", 30, 8000, catBarba.id, 1);
  const svcCorteBarba = await upsertService("Corte + Barba", 75, 18000, catCorte.id, 3);
  console.log("✅ Servicios creados");

  // ─── Barber Users + Profiles ──────────────────────────
  const barberUser1 = await prisma.user.upsert({
    where: { email: "daniel@barberia.cl" },
    update: {},
    create: {
      name: "Daniel Silva",
      email: "daniel@barberia.cl",
      phone: "+56933445566",
      password: barberHash,
      role: Role.BARBER,
      orgId: org.id,
    },
  });
  const barber1 = await prisma.barber.upsert({
    where: { userId: barberUser1.id },
    update: {},
    create: {
      userId: barberUser1.id,
      branchId: branch.id,
      commissionType: "PERCENTAGE",
      commissionValue: 40,
      color: "#3B82F6",
      active: true,
    },
  });

  const barberUser2 = await prisma.user.upsert({
    where: { email: "juan@barberia.cl" },
    update: {},
    create: {
      name: "Juan Pérez",
      email: "juan@barberia.cl",
      phone: "+56944556677",
      password: barberHash,
      role: Role.BARBER,
      orgId: org.id,
    },
  });
  const barber2 = await prisma.barber.upsert({
    where: { userId: barberUser2.id },
    update: {},
    create: {
      userId: barberUser2.id,
      branchId: branch.id,
      commissionType: "PERCENTAGE",
      commissionValue: 35,
      color: "#10B981",
      active: true,
    },
  });
  console.log("✅ Barberos creados");

  // ─── Barber Schedules ─────────────────────────────────
  for (const barber of [barber1, barber2]) {
    for (let day = 1; day <= 6; day++) {
      await prisma.barberSchedule.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: day } },
        update: {},
        create: {
          barberId: barber.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isWorking: true,
        },
      });
    }
  }
  console.log("✅ Horarios de barberos creados");

  // ─── Barber Services ──────────────────────────────────
  const allServices = [svcCorteClasico, svcCorteDiseno, svcBarba, svcCorteBarba];
  for (const barber of [barber1, barber2]) {
    for (const svc of allServices) {
      await prisma.barberService.upsert({
        where: { barberId_serviceId: { barberId: barber.id, serviceId: svc.id } },
        update: {},
        create: { barberId: barber.id, serviceId: svc.id },
      });
    }
  }
  console.log("✅ Servicios asignados a barberos");

  // ─── Client Users + Profiles ──────────────────────────
  const clientUser1 = await prisma.user.upsert({
    where: { email: "carlos@gmail.com" },
    update: {},
    create: {
      name: "Carlos Muñoz",
      email: "carlos@gmail.com",
      phone: "+56955667788",
      password: clientHash,
      role: Role.CLIENT,
    },
  });
  const client1 = await prisma.client.upsert({
    where: { userId: clientUser1.id },
    update: {},
    create: { userId: clientUser1.id },
  });

  const clientUser2 = await prisma.user.upsert({
    where: { email: "maria@gmail.com" },
    update: {},
    create: {
      name: "María López",
      email: "maria@gmail.com",
      phone: "+56966778899",
      password: clientHash,
      role: Role.CLIENT,
    },
  });
  const client2 = await prisma.client.upsert({
    where: { userId: clientUser2.id },
    update: {},
    create: { userId: clientUser2.id },
  });
  console.log("✅ Clientes creados");

  // ─── Sample Appointments (idempotent: skip if exist) ──
  const existingApts = await prisma.appointment.count();
  if (existingApts === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const apt1 = await prisma.appointment.create({
      data: {
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 45 * 60_000),
        status: "CONFIRMED",
        price: svcCorteClasico.price,
        barberId: barber1.id,
        serviceId: svcCorteClasico.id,
        clientId: client1.id,
        branchId: branch.id,
        notePublic: "Primera visita",
      },
    });

    const apt2Start = new Date(tomorrow);
    apt2Start.setHours(11, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        start: apt2Start,
        end: new Date(apt2Start.getTime() + 75 * 60_000),
        status: "RESERVED",
        price: svcCorteBarba.price,
        barberId: barber2.id,
        serviceId: svcCorteBarba.id,
        clientId: client2.id,
        branchId: branch.id,
      },
    });

    const apt3Start = new Date(tomorrow);
    apt3Start.setHours(14, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        start: apt3Start,
        end: new Date(apt3Start.getTime() + 30 * 60_000),
        status: "RESERVED",
        price: svcBarba.price,
        barberId: barber1.id,
        serviceId: svcBarba.id,
        clientId: client2.id,
        branchId: branch.id,
      },
    });
    console.log("✅ Citas de ejemplo creadas");

    // ─── Sample Payment ───────────────────────────────────
    await prisma.payment.create({
      data: {
        amount: apt1.price,
        tip: 2000,
        method: "CASH",
        status: "PAID",
        appointmentId: apt1.id,
        paidAt: new Date(),
      },
    });
    console.log("✅ Pago de ejemplo creado");

    // ─── Sample BlockTime ─────────────────────────────────
    const blockStart = new Date(tomorrow);
    blockStart.setHours(16, 0, 0, 0);
    await prisma.blockTime.create({
      data: {
        reason: "Almuerzo",
        start: blockStart,
        end: new Date(blockStart.getTime() + 60 * 60_000),
        barberId: barber1.id,
      },
    });
    console.log("✅ Bloqueo de ejemplo creado");
  } else {
    console.log("⏭️  Citas ya existen, saltando...");
  }

  // ─── Loyalty Config ───────────────────────────────────
  await prisma.loyaltyConfig.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      pointsPerCLP: 0.01,
      clpPerPoint: 100,
      active: false,
    },
  });
  console.log("✅ Configuración de fidelización creada");

  console.log("\n🎉 Seed completo!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
