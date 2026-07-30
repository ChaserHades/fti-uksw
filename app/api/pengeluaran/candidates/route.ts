import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const kodePembelian = searchParams.get("kodePembelian");

  if (!kodePembelian) {
    return NextResponse.json({ data: [] });
  }

  const kelompok = await prisma.kelompokPembelian.findUnique({
    where: { kode: kodePembelian }
  });

  const whereClause: any = {
    OR: []
  };

  if (kelompok) {
    whereClause.OR.push({ kelompokPembelianId: kelompok.id });
  }

  whereClause.OR.push({ label: { endsWith: `-${kodePembelian}` } });

  const parts = kodePembelian.split('-');
  if (parts.length === 2 && parts[0].length === 6) {
    const month = parseInt(parts[0].substring(0, 2), 10);
    const year = parseInt(parts[0].substring(2, 6), 10);
    const pk = parseInt(parts[1], 10);
    if (!isNaN(month) && !isNaN(year) && !isNaN(pk)) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      whereClause.OR.push({
        kelompokPembelianId: null,
        pembelianKe: pk,
        tanggalDatang: {
          gte: startDate,
          lt: endDate,
        }
      });
    }
  }

  let candidates = await prisma.barang.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Sort:
  // 1. Exact group match
  // 2. Others (legacy)
  candidates.sort((a, b) => {
    if (kelompok) {
      const aMatch = a.kelompokPembelianId === kelompok.id;
      const bMatch = b.kelompokPembelianId === kelompok.id;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });

  return NextResponse.json({ data: candidates, kelompokPembelianId: kelompok?.id || null });
}
