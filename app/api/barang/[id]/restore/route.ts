import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await checkApiAuth();
  if (error) return error;

  try {
    const barang = await prisma.barang.findUnique({ where: { id } });
    if (!barang) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!barang.deletedAt) return NextResponse.json({ error: "Barang tidak dalam status terhapus" }, { status: 400 });

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
    return NextResponse.json({ error: e.message || "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
