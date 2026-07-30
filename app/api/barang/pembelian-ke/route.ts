// app/api/barang/pembelian-ke/route.ts
// Returns the next purchase sequence number for a given month/year.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/barang/pembelian-ke?bulan=07&tahun=2026
 * Returns { pembelianKe: number } the next auto-increment for the given month+year.
 * Logic: count barang where tanggalDatang falls within the month/year, then return count+1.
 */
export async function GET(req: Request) {
  const { error } = await checkApiAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const bulan = searchParams.get("bulan"); // "07"
  const tahun = searchParams.get("tahun"); // "2026"

  if (!bulan || !tahun) {
    return NextResponse.json({ error: "Parameter bulan dan tahun wajib diisi" }, { status: 400 });
  }

  const bulanInt = parseInt(bulan, 10);
  const tahunInt = parseInt(tahun, 10);

  if (isNaN(bulanInt) || isNaN(tahunInt) || bulanInt < 1 || bulanInt > 12) {
    return NextResponse.json({ error: "Bulan atau tahun tidak valid" }, { status: 400 });
  }

  // First day and last day of the month
  const startDate = new Date(tahunInt, bulanInt - 1, 1);
  const endDate = new Date(tahunInt, bulanInt, 1); // exclusive upper bound

  // Aggregate max pembelianKe from KelompokPembelian
  const agg = await prisma.kelompokPembelian.aggregate({
    _max: {
      pembelianKe: true,
    },
    where: {
      tanggal: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  const maxPembelianKe = agg._max.pembelianKe || 0;

  // Fallback to max from Barang in case there is unmigrated data, just to be safe
  const aggBarang = await prisma.barang.aggregate({
    _max: {
      pembelianKe: true,
    },
    where: {
      tanggalDatang: {
        gte: startDate,
        lt: endDate,
      },
    },
  });
  
  const maxBarang = aggBarang._max.pembelianKe || 0;
  const currentMax = Math.max(maxPembelianKe, maxBarang);

  return NextResponse.json({ pembelianKe: currentMax + 1 });
}
