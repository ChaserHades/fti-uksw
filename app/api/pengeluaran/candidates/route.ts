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
    OR: [
      { kelompokPembelianId: null }
    ]
  };

  if (kelompok) {
    whereClause.OR.push({ kelompokPembelianId: kelompok.id });
  }

  const candidates = await prisma.barang.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: candidates, kelompokPembelianId: kelompok?.id || null });
}
