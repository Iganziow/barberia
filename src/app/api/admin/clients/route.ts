import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { searchClients, listClients, createClient } from "@/lib/services/client.service";
import { CreateClientSchema } from "@/lib/validations/client";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const orgId = auth.payload.orgId;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const list = searchParams.get("list") === "true";

    if (list) {
      const clients = await listClients(orgId, query || undefined);
      return NextResponse.json({
        clients: clients.map((c) => ({
          id: c.id,
          name: c.user.name,
          email: c.user.email,
          phone: c.user.phone,
          appointmentCount: c._count.appointments,
        })),
      });
    }

    const clients = await searchClients(query, orgId);
    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.user.name,
        email: c.user.email,
        phone: c.user.phone,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/clients failed:", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = CreateClientSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const client = await createClient(parsed.data);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    // Handle unique constraint on email
    const message =
      err instanceof Error && err.message.includes("Unique")
        ? "Ya existe un cliente con ese email"
        : "Error al crear cliente";
    return NextResponse.json({ message }, { status: 400 });
  }
}
