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

  // Persisten: jika kembali melewati deadline → terlambat = true, tidak pernah di-reset
  const now = new Date();
  const wasLate = peminjaman.terlambat || now > peminjaman.deadlineKembali;

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
