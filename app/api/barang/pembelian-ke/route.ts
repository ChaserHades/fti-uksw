// app/api/barang/pembelian-ke/route.ts
// Returns the next purchase sequence number for a given month/year.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/barang/pembelian-ke?bulan=07&tahun=2026
 * Returns { pembelianKe: number } — the next auto-increment for the given month+year.
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

  const count = await prisma.barang.count({
    where: {
      tanggalDatang: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  return NextResponse.json({ pembelianKe: count + 1 });
}
