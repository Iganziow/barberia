import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@barberia.cl";
  const password = "Admin1234!";
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrador",
      email,
      password: hash,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Admin creado");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
