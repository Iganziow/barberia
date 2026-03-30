import { NextResponse } from "next/server";
import {
  getAvailableSlots,
  getBarbersWithAvailability,
} from "@/lib/services/availability.service";
import { getServices } from "@/lib/services/service.service";
import { getOrgIdFromHeaders } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barberId = searchParams.get("barberId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const serviceId = searchParams.get("serviceId");
    const branchId = searchParams.get("branchId");

    if (!date || !serviceId) {
      return NextResponse.json(
        { message: "Se requiere date y serviceId" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return NextResponse.json({ slots: [], barbers: [] });
    }

    // Get service duration
    const orgId = await getOrgIdFromHeaders(req);
    const services = await getServices(orgId);
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return NextResponse.json(
        { message: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    // If barberId specified, return slots for that barber
    if (barberId) {
      const slots = await getAvailableSlots(barberId, date, service.durationMin);
      return NextResponse.json({ slots });
    }

    // Otherwise return barbers with availability count
    if (branchId) {
      const barbers = await getBarbersWithAvailability(
        branchId,
        date,
        service.durationMin
      );
      return NextResponse.json({ barbers });
    }

    return NextResponse.json(
      { message: "Se requiere barberId o branchId" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /api/book/availability failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
