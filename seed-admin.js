// Seed script to create an admin user for testing
const { PrismaClient } = require("./generated/prisma");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  
  // Update existing user to ADMIN + APPROVED, or create one
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
