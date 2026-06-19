// app/api/transaksi/[id]/kembali/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transaksi = await prisma.transaksi.findUnique({ where: { id } });
  if (!transaksi || transaksi.status === "SELESAI")
    return NextResponse.json({ error: "Transaksi tidak valid" }, { status: 400 });

  // Persisten: jika kembali melewati deadline → terlambat = true, tidak pernah di-reset
  const now = new Date();
  const wasLate = transaksi.terlambat || now > transaksi.deadlineKembali;

  const [updated] = await prisma.$transaction([
    prisma.transaksi.update({
      where: { id },
      data: { status: "SELESAI", tanggalKembali: now, terlambat: wasLate },
    }),
    prisma.barang.update({
      where: { id: transaksi.barangId },
      data: { status: "TERSEDIA" },
    }),
  ]);

  return NextResponse.json(updated);
}
