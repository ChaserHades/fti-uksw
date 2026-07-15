// Seed script to create an admin user for testing
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({
    connectionString: "postgresql://admin:adminpassword@localhost:5432/fti_uksw_db?schema=public",
  });
  const prisma = new PrismaClient({ adapter });
  
  const email = "admin@fti.uksw.edu";
  const password = await bcrypt.hash("admin123", 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      statusVerifikasi: "APPROVED",
      mustChangePassword: false,
      password,
      name: "Admin FTI",
    },
    create: {
      email,
      password,
      name: "Admin FTI",
      role: "ADMIN",
      statusVerifikasi: "APPROVED",
      mustChangePassword: false,
    },
  });
  
  console.log("Admin user ready:", user.email, "| Role:", user.role, "| Status:", user.statusVerifikasi);
  await prisma.$disconnect();
}

main().catch(console.error);
