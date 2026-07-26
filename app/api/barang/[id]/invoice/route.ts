// app/api/barang/[id]/invoice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/barang/:id/invoice
 * 
 * Looks up the Pengeluaran (invoice) linked to this barang via its label code.
 * Label format: PREFIX-MMYYYY-NNN (e.g. CADD-BKT-022023-001)
 * We extract the last segment matching pattern MMYYYY-NNN and search
 * Pengeluaran.kodePembelian for a match.
 */
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const barang = await prisma.barang.findUnique({
    where: { id },
    include: { kategori: true, ruangan: true },
  });
  if (!barang) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });

  let pengeluaran = null;

  // Extract kodePembelian from label (e.g. "CADD-BKT-022023-001" to "022023-001")
  if (barang.label) {
    // Match pattern: 6-digit date + dash + 3-digit sequence (MMYYYY-NNN)
    const match = barang.label.match(/(\d{6}-\d{3})$/);
    if (match) {
      const kodePembelian = match[1];
      pengeluaran = await prisma.pengeluaran.findFirst({
        where: { kodePembelian },
        include: { user: true },
      });
    }
  }

  return NextResponse.json({ barang, pengeluaran });
}
