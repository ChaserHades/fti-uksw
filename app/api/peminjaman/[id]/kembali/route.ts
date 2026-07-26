// app/api/peminjaman/[id]/kembali/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN" && session.role !== "TEKNISI") {
    return NextResponse.json({ error: "Forbidden: Hanya teknisi atau admin yang dapat memproses pengembalian" }, { status: 403 });
  }

  const { id } = await params;
  const peminjaman = await prisma.peminjaman.findUnique({ where: { id } });
  if (!peminjaman || peminjaman.status === "SELESAI")
    return NextResponse.json({ error: "Peminjaman tidak valid" }, { status: 400 });

  // Persisten: jika kembali melewati deadline, terlambat = true
  const now = new Date();
  
  // Ambil tanggal saja dari deadline (yang tersimpan dalam UTC midnight)
  const str = peminjaman.deadlineKembali.toISOString();
  const dateOnly = str.split("T")[0]; 
  // Deadline dianggap jam 18:00 waktu lokal (WIB/UTC+7) di hari H
  const targetTime = new Date(`${dateOnly}T18:00:00+07:00`);
  
  const wasLate = peminjaman.terlambat || now > targetTime;

  const [updated] = await prisma.$transaction([
    prisma.peminjaman.update({
      where: { id },
      data: { status: "SELESAI", tanggalKembali: now, terlambat: wasLate },
    }),
    prisma.barang.update({
      where: { id: peminjaman.barangId },
      data: { status: "TERSEDIA" },
    }),
  ]);

  return NextResponse.json(updated);
}
