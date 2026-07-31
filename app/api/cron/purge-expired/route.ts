import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    const expiredBarang = await prisma.barang.findMany({
      where: {
        deletedAt: {
          lt: sixDaysAgo
        }
      },
      select: {
        id: true,
        label: true,
        namaBarang: true
      }
    });

    const results = [];

    for (const barang of expiredBarang) {
      // Explicit history relation check
      const historyCount = await prisma.peminjaman.count({
        where: { barangId: barang.id }
      });

      if (historyCount > 0) {
        results.push({
          id: barang.id,
          status: "skipped",
          reason: "Has Peminjaman history"
        });
        continue;
      }

      try {
        await prisma.barang.delete({
          where: { id: barang.id }
        });
        results.push({
          id: barang.id,
          status: "purged"
        });
      } catch (err: any) {
        results.push({
          id: barang.id,
          status: "error",
          error: err.message
        });
      }
    }

    return NextResponse.json({
      message: "Purge completed",
      totalProcessed: expiredBarang.length,
      results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
