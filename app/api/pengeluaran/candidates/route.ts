// app/api/pengeluaran/candidates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { extractPurchaseCodeFromAssetLabel } from "@/lib/purchase-code";

export async function GET(req: Request) {
  const { error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const kodePembelian = searchParams.get("kodePembelian");

  if (!kodePembelian) {
    return NextResponse.json({ data: [] });
  }

  // ── 1. Cari KelompokPembelian yang cocok ──
  const kelompok = await prisma.kelompokPembelian.findUnique({
    where: { kode: kodePembelian }
  });

  const results: any[] = [];

  // ── 2. Primary match: kelompokPembelianId exact ──
  if (kelompok) {
    const byGroup = await prisma.barang.findMany({
      where: {
        kelompokPembelianId: kelompok.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    results.push(...byGroup);
  }

  // ── 3. Legacy fallback: barang tanpa group, difilter oleh konteks bulan/tahun + pembelianKe ──
  // hanya jika kodePembelian punya format valid MMYYYY-NNN
  const parts = kodePembelian.split("-");
  if (parts.length === 2 && parts[0].length === 6) {
    const month = parseInt(parts[0].substring(0, 2), 10);
    const year = parseInt(parts[0].substring(2, 6), 10);
    const pk = parseInt(parts[1], 10);

    if (!isNaN(month) && !isNaN(year) && !isNaN(pk)) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      // Cari barang legacy: tidak punya kelompokPembelianId, bulan/tahun dan pembelianKe cocok
      const legacyByDate = await prisma.barang.findMany({
        where: {
          kelompokPembelianId: null,
          deletedAt: null,
          pembelianKe: pk,
          tanggalDatang: { gte: startDate, lt: endDate },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      results.push(...legacyByDate);

      // Cari barang legacy yang punya label dengan purchase code ini, tapi TIDAK punya kelompok
      // Validasi dengan helper untuk memastikan kode yang diekstrak tepat, bukan substring random
      const legacyByLabel = await prisma.barang.findMany({
        where: {
          kelompokPembelianId: null,
          deletedAt: null,
          label: { not: null },
        },
        select: { id: true, label: true },
        take: 500,
      });

      const matchedIds = legacyByLabel
        .filter(b => extractPurchaseCodeFromAssetLabel(b.label) === kodePembelian)
        .map(b => b.id);

      if (matchedIds.length > 0) {
        const fullLegacy = await prisma.barang.findMany({
          where: { id: { in: matchedIds }, deletedAt: null },
          orderBy: { createdAt: "desc" },
        });
        results.push(...fullLegacy);
      }
    }
  }

  // ── 4. Deduplicate by ID ──
  const seen = new Set<string>();
  const unique = results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // ── 5. Urutkan: kelompokPembelianId match lebih dulu ──
  unique.sort((a, b) => {
    if (kelompok) {
      const aMatch = a.kelompokPembelianId === kelompok.id;
      const bMatch = b.kelompokPembelianId === kelompok.id;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });

  return NextResponse.json({ data: unique, kelompokPembelianId: kelompok?.id || null });
}
