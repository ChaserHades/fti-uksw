// app/api/barang/next-label-sequence/route.ts
// Menghitung nomor urut aset berikutnya dalam satu Purchase Group + prefix.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/barang/next-label-sequence?baseLabel=LAP-APP-072026-001
 * Returns { nextSequence: number, nextLabel: string }
 *
 * Format label baru: {baseLabel}-{NNN}
 * Contoh: LAP-APP-072026-001-001
 *
 * Penghitungan: cari MAX suffix NNN dari label yang match pattern "baseLabel-NNN",
 * lalu return MAX+1. Aman terhadap gap.
 */
export async function GET(req: Request) {
  const { error } = await checkApiAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const baseLabel = searchParams.get("baseLabel");

  if (!baseLabel) {
    return NextResponse.json({ error: "Parameter baseLabel wajib diisi" }, { status: 400 });
  }

  // Cari semua barang dengan label yang dimulai dengan baseLabel-
  const prefix = `${baseLabel}-`;
  const existing = await prisma.barang.findMany({
    where: {
      label: { startsWith: prefix },
    },
    select: { label: true },
  });

  let maxSeq = 0;
  for (const b of existing) {
    if (!b.label) continue;
    const suffix = b.label.slice(prefix.length);
    // Hanya ambil jika suffix adalah 3 digit angka
    if (/^\d{3}$/.test(suffix)) {
      const n = parseInt(suffix, 10);
      if (n > maxSeq) maxSeq = n;
    }
  }

  // Cek juga apakah baseLabel itu sendiri sudah ada (format lama tanpa suffix)
  const legacyExists = await prisma.barang.findUnique({ where: { label: baseLabel } });

  // Jika legacy exist, start sequence dari 1 agar format baru tidak bentrok dengan legacy
  // Legacy tetap valid, format baru mulai dari -001
  const nextSeq = maxSeq + 1;
  const nextLabel = `${baseLabel}-${String(nextSeq).padStart(3, "0")}`;

  return NextResponse.json({ nextSequence: nextSeq, nextLabel, hasLegacy: !!legacyExists });
}
