import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@uksw.edu" },
    update: {},
    create: {
      email: "admin@uksw.edu",
      name: "Administrator",
      password: hash,
      role: "ADMIN",
      statusVerifikasi: "APPROVED",
    },
  });

  const hashP = await bcrypt.hash("petugas123", 12);
  await prisma.user.upsert({
    where: { email: "petugas@uksw.edu" },
    update: {},
    create: {
      email: "petugas@uksw.edu",
      name: "Petugas Demo",
      password: hashP,
      role: "PETUGAS",
      statusVerifikasi: "APPROVED",
    },
  });

  const kategoriData = [
    { nama: "Komputer",    deskripsi: "Laptop, PC, dan perangkat komputer" },
    { nama: "Proyektor",   deskripsi: "Proyektor dan layar presentasi" },
    { nama: "Furnitur",    deskripsi: "Meja, kursi, dan perabot ruangan" },
    { nama: "Jaringan",    deskripsi: "Router, switch, dan kabel jaringan" },
    { nama: "Audio Visual",deskripsi: "Speaker, mikrofon, dan kamera" },
  ];
  for (const k of kategoriData) {
    await prisma.kategoriBarang.upsert({
      where: { nama: k.nama },
      update: {},
      create: k,
    });
  }

  const ruanganData = [
    { kode: "R101",  nama: "Ruang Kuliah 101", gedung: "A", lantai: "1", kapasitas: 40 },
    { kode: "R102",  nama: "Ruang Kuliah 102", gedung: "A", lantai: "1", kapasitas: 40 },
    { kode: "LAB1",  nama: "Lab Komputer 1",   gedung: "B", lantai: "1", kapasitas: 30 },
    { kode: "LAB2",  nama: "Lab Komputer 2",   gedung: "B", lantai: "2", kapasitas: 30 },
    { kode: "SEM",   nama: "Ruang Seminar",    gedung: "A", lantai: "3", kapasitas: 100 },
  ];
  for (const r of ruanganData) {
    await prisma.ruangan.upsert({
      where: { kode: r.kode },
      update: {},
      create: r,
    });
  }

  console.log("Seed selesai!");
  console.log("  Admin  -> admin@uksw.edu   / admin123");
  console.log("  Petugas-> petugas@uksw.edu / petugas123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());