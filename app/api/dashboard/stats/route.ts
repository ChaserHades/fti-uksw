// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalBarang, totalRuangan, totalUsers, pendingVerifikasi, dipinjam, terlambat,
    tersediaBarang, dipinjamBarang, maintenanceBarang,
    baikBarang, rusakRinganBarang, rusakBeratBarang,
    katGroupBy,
    pengeluaranAgg
  ] = await Promise.all([
    prisma.barang.count({ where: { deletedAt: null } }),
    prisma.ruangan.count(),
    prisma.user.count(),
    prisma.user.count({ where: { statusVerifikasi: "PENDING" } }),
    prisma.peminjaman.count({ where: { status: "AKTIF" } }),
    prisma.peminjaman.count({ where: { status: "AKTIF", deadlineKembali: { lt: new Date() } } }),
    prisma.barang.count({ where: { status: "TERSEDIA", deletedAt: null } }),
    prisma.barang.count({ where: { status: "DIPINJAM", deletedAt: null } }),
    prisma.barang.count({ where: { status: "MAINTENANCE", deletedAt: null } }),
    prisma.barang.count({ where: { kondisi: "BAIK", deletedAt: null } }),
    prisma.barang.count({ where: { kondisi: "RUSAK_RINGAN", deletedAt: null } }),
    prisma.barang.count({ where: { kondisi: "RUSAK_BERAT", deletedAt: null } }),
    prisma.barang.groupBy({
      by: ['kategoriId'],
      where: { deletedAt: null },
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
    const kategori = await prisma.kategori.findMany({
      where: { id: { in: katGroupBy.map(k => k.kategoriId) } }
    });
    
    for (const g of katGroupBy) {
      const jb = kategori.find(j => j.id === g.kategoriId);
      katStat.push({
        nama: jb?.nama || "Lainnya",
        total: g._count.id
      });
    }
    katStat.sort((a, b) => b.total - a.total);
  }

  return NextResponse.json({
    totalBarang,
    totalRuangan,
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
