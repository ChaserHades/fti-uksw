// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mark overdue transactions as terlambat (persisten flag)
  await prisma.transaksi.updateMany({
    where: { status: "AKTIF", deadlineKembali: { lt: new Date() }, terlambat: false },
    data: { terlambat: true },
  });

  const [totalBarang, totalRuangan, totalUsers, pendingVerifikasi, dipinjam, terlambat] =
    await Promise.all([
      prisma.barang.count(),
      prisma.ruangan.count(),
      prisma.user.count(),
      prisma.user.count({ where: { statusVerifikasi: "PENDING" } }),
      prisma.transaksi.count({ where: { status: "AKTIF" } }),
      prisma.transaksi.count({ where: { terlambat: true, status: "AKTIF" } }),
    ]);

  return NextResponse.json({ totalBarang, totalRuangan, totalUsers, pendingVerifikasi, dipinjam, terlambat });
}
