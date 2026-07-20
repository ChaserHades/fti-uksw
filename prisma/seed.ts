import { config } from "dotenv";
import { resolve } from "path";

// Load .env dari root project
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    { email: "admin@fti.local", name: "Administrator", password: "admin123", role: "ADMIN" as const, statusVerifikasi: "APPROVED" as const },
    { email: "teknisi@fti.local", name: "Teknisi Demo", password: "teknisi123", role: "TEKNISI" as const, statusVerifikasi: "APPROVED" as const },
    { email: "universitas@fti.local", name: "Pihak Univ", password: "universitas123", role: "UNIVERSITAS" as const, statusVerifikasi: "APPROVED" as const },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, password: hash, role: u.role, statusVerifikasi: u.statusVerifikasi },
    });
  }

  // Dummy data dihapus sesuai request, mulai dari sini data akan murni dari input pengguna.

  console.log("Seed selesai!");
  console.log("  admin@fti.local       / admin123");
  console.log("  teknisi@fti.local     / teknisi123");
  console.log("  universitas@fti.local / universitas123");
}

main().catch(console.error).finally(() => prisma.$disconnect());