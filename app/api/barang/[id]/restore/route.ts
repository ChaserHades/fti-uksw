import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await checkApiAuth();
  if (error) return error;

  if (session.role !== "ADMIN" && session.role !== "TEKNISI") {
    return NextResponse.json({ error: "Forbidden. Hanya admin dan teknisi yang dapat memulihkan barang." }, { status: 403 });
  }

  try {
    const barang = await prisma.barang.findUnique({ where: { id } });
    if (!barang) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!barang.deletedAt) return NextResponse.json({ error: "Barang tidak dalam status terhapus" }, { status: 400 });

    const now = Date.now();
    const deletedAtTime = barang.deletedAt.getTime();
    const deadline = deletedAtTime + 6 * 24 * 60 * 60 * 1000;

    if (now > deadline) {
      return NextResponse.json({ error: "Periode pemulihan telah berakhir (lebih dari 6 hari)" }, { status: 400 });
    }

    const restored = await prisma.barang.update({
      where: { id },
      data: { deletedAt: null }
    });

    await prisma.logAktivitas.create({
      data: {
        aksi: "UPDATE",
        entitas: "BARANG",
        entitasId: id,
        detail: `Memulihkan (Restore) barang: ${restored.label || restored.labelAset || restored.merek || "Tanpa Nama"}`,
        userId: session.id
      }
    });

    return NextResponse.json(restored);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
