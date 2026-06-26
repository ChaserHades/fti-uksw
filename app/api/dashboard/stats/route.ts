// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalBarang, totalLetak, totalUsers, pendingVerifikasi, dipinjam, terlambat,
    tersediaBarang, dipinjamBarang, maintenanceBarang,
    baikBarang, rusakRinganBarang, rusakBeratBarang,
    katGroupBy,
    pengeluaranAgg
  ] = await Promise.all([
    prisma.barang.count(),
    prisma.letak.count(),
    prisma.user.count(),
    prisma.user.count({ where: { statusVerifikasi: "PENDING" } }),
    prisma.transaksi.count({ where: { status: "AKTIF" } }),
    prisma.transaksi.count({ where: { status: "AKTIF", deadlineKembali: { lt: new Date() } } }),
    prisma.barang.count({ where: { status: "TERSEDIA" } }),
    prisma.barang.count({ where: { status: "DIPINJAM" } }),
    prisma.barang.count({ where: { status: "MAINTENANCE" } }),
    prisma.barang.count({ where: { kondisi: "BAIK" } }),
    prisma.barang.count({ where: { kondisi: "RUSAK_RINGAN" } }),
    prisma.barang.count({ where: { kondisi: "RUSAK_BERAT" } }),
    prisma.barang.groupBy({
      by: ['jenisBarangId'],
      _count: { id: true }
    }),
    prisma.pengeluaran.aggregate({
      _sum: { nominal: true },
      _count: { id: true }
    })
  ]);

  // Fetch Kat Names
  const katStat = [];
  if (katGroupBy && katGroupBy.length > 0) {
    const jenisBarang = await prisma.jenisBarang.findMany({
      where: { id: { in: katGroupBy.map(k => k.jenisBarangId) } }
    });
    
    for (const g of katGroupBy) {
      const jb = jenisBarang.find(j => j.id === g.jenisBarangId);
      katStat.push({
        nama: jb?.nama || "Lainnya",
        total: g._count.id
      });
    }
    katStat.sort((a, b) => b.total - a.total);
  }

  return NextResponse.json({
    totalBarang,
    totalLetak,
    totalUsers,
    pendingVerifikasi,
    dipinjam,
    terlambat,
    statusStat: {
      tersedia: tersediaBarang,
      dipinjam: dipinjamBarang,
      maintenance: maintenanceBarang,
      total: totalBarang
    },
    kondisiStat: {
      baik: baikBarang,
      rusakRingan: rusakRinganBarang,
      rusakBerat: rusakBeratBarang
    },
    katStat: katStat.slice(0, 5),
    pengeluaranStat: {
      totalNominal: pengeluaranAgg._sum.nominal || 0,
      count: pengeluaranAgg._count.id || 0
    }
  });
}
