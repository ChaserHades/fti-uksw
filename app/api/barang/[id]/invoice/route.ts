// app/api/barang/[id]/invoice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { publicUserSelect } from "@/lib/public-user";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/barang/:id/invoice
 *
 * Mengambil Pengeluaran yang terhubung dengan aset ini via KelompokPembelian.
 * Fallback: ekstrak kodePembelian dari label (mendukung format lama dan baru).
 */
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const barang = await prisma.barang.findUnique({
    where: { id },
    include: { 
      kategori: true, 
      ruangan: true,
      kelompokPembelian: {
        include: { pengeluaran: { include: { user: { select: publicUserSelect } } } }
      }
    },
  });
  if (!barang) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });

  let pengeluarans: any[] = [];

  // Prioritize KelompokPembelian relation
  if (barang.kelompokPembelian && barang.kelompokPembelian.pengeluaran.length > 0) {
    pengeluarans = barang.kelompokPembelian.pengeluaran;
  } else if (barang.label) {
    // Fallback: ekstrak kodePembelian dari label
    // Format lama: LAP-APP-072026-001 → 072026-001
    // Format baru: LAP-APP-072026-001-002 → 072026-001
    const { extractPurchaseCodeFromAssetLabel } = await import("@/lib/purchase-code");
    const kodePembelian = extractPurchaseCodeFromAssetLabel(barang.label);
    if (kodePembelian) {
      pengeluarans = await prisma.pengeluaran.findMany({
        where: { kodePembelian },
        include: { user: { select: publicUserSelect } },
      });
    }
  }

  return NextResponse.json({ 
    barang, 
    pengeluaran: pengeluarans.length > 0 ? pengeluarans[0] : null,
    pengeluarans 
  });
}
