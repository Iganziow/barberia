import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-handler";
import { searchClients, listClients, createClient } from "@/lib/services/client.service";
import { CreateClientSchema } from "@/lib/validations/client";

export const GET = withAdmin(async (req, { orgId }) => {
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
});

export const POST = withAdmin(async (req) => {
  const json = await req.json().catch(() => null);
  const parsed = CreateClientSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Datos inválidos.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const client = await createClient(parsed.data);
  return NextResponse.json({ client }, { status: 201 });
});
