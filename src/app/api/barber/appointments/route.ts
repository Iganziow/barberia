import { NextResponse } from "next/server";
import { requireBarber } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireBarber();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.payload.sub;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD (list view)
    const fromParam = searchParams.get("from");  // ISO (calendar range)
    const toParam = searchParams.get("to");      // ISO (calendar range)

    const barber = await prisma.barber.findUnique({
      where: { userId },
      include: { branch: { select: { orgId: true } } },
    });
    if (!barber) {
      return NextResponse.json({ message: "Barbero no encontrado" }, { status: 404 });
    }
    // Verify barber belongs to the org from JWT
    if (auth.payload.orgId && barber.branch.orgId !== auth.payload.orgId) {
      return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
    }

    let startFilter: Date;
    let endFilter: Date;

    if (fromParam && toParam) {
      // Calendar range mode
      startFilter = new Date(fromParam);
      endFilter = new Date(toParam);
    } else {
      // Single day mode (default to today)
      const dateStr = dateParam || new Date().toISOString().split("T")[0];
      const [year, month, day] = dateStr.split("-").map(Number);
      startFilter = new Date(year, month - 1, day);
      endFilter = new Date(year, month - 1, day + 1);
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        start: { gte: startFilter, lt: endFilter },
      },
      include: {
        service: { select: { name: true, durationMin: true } },
        client: { include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { start: "asc" },
    });

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        start: a.start.toISOString(),
        end: a.end.toISOString(),
        status: a.status,
        price: a.price,
        serviceName: a.service.name,
        serviceDuration: a.service.durationMin,
        clientName: a.client.user.name,
        clientPhone: a.client.user.phone,
        notePublic: a.notePublic,
      })),
    });
  } catch (err) {
    console.error("GET /api/barber/appointments failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
