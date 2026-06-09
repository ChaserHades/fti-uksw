import { config } from "dotenv";
import { resolve } from "path";

// Load .env dari root project
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const users = [
    { email: "admin@fti.local",       name: "Administrator", password: "admin123",       role: "ADMIN"       as const, statusVerifikasi: "APPROVED" as const },
    { email: "petugas@fti.local",     name: "Petugas Demo",  password: "petugas123",     role: "PETUGAS"     as const, statusVerifikasi: "APPROVED" as const },
    { email: "universitas@fti.local", name: "Pihak Univ",   password: "universitas123", role: "UNIVERSITAS" as const, statusVerifikasi: "APPROVED" as const },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, password: hash, role: u.role, statusVerifikasi: u.statusVerifikasi },
    });
  }

  const kategoriData = [
    { nama: "Komputer",     deskripsi: "Laptop, PC, dan perangkat komputer" },
    { nama: "Proyektor",    deskripsi: "Proyektor dan layar presentasi" },
    { nama: "Furnitur",     deskripsi: "Meja, kursi, dan perabot ruangan" },
    { nama: "Jaringan",     deskripsi: "Router, switch, dan kabel jaringan" },
    { nama: "Audio Visual", deskripsi: "Speaker, mikrofon, dan kamera" },
  ];
  for (const k of kategoriData) {
    await prisma.kategoriBarang.upsert({ where: { nama: k.nama }, update: {}, create: k });
  }

  const ruanganData = [
    { kode: "R101", nama: "Ruang Kuliah 101", gedung: "A", lantai: "1", kapasitas: 40 },
    { kode: "R102", nama: "Ruang Kuliah 102", gedung: "A", lantai: "1", kapasitas: 40 },
    { kode: "LAB1", nama: "Lab Komputer 1",   gedung: "B", lantai: "1", kapasitas: 30 },
    { kode: "LAB2", nama: "Lab Komputer 2",   gedung: "B", lantai: "2", kapasitas: 30 },
    { kode: "SEM",  nama: "Ruang Seminar",    gedung: "A", lantai: "3", kapasitas: 100 },
  ];
  for (const r of ruanganData) {
    await prisma.ruangan.upsert({ where: { kode: r.kode }, update: {}, create: r });
  }

  console.log("Seed selesai!");
  console.log("  admin@fti.local       / admin123");
  console.log("  petugas@fti.local     / petugas123");
  console.log("  universitas@fti.local / universitas123");
}

main().catch(console.error).finally(() => prisma.$disconnect());