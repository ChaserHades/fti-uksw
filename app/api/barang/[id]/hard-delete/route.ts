import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await checkApiAuth();
  if (error) return error;

  // Hanya admin yang bisa hard delete
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Hanya admin yang dapat menghapus permanen." }, { status: 403 });
  }

  try {
    const barangToDelete = await prisma.barang.findUnique({ where: { id } });
    if (!barangToDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!barangToDelete.deletedAt) return NextResponse.json({ error: "Barang belum di-soft delete" }, { status: 400 });

    const historyCount = await prisma.peminjaman.count({ where: { barangId: id } });
    if (historyCount > 0) {
      return NextResponse.json(
        { error: "Aset tidak bisa dihapus permanen karena masih terikat dengan riwayat peminjaman. Hapus riwayat peminjaman terlebih dahulu." },
        { status: 409 } // 409 Conflict is more semantic for this
      );
    }

    await prisma.barang.delete({ where: { id } });

    await prisma.logAktivitas.create({
      data: {
        aksi: "DELETE",
        entitas: "BARANG",
        entitasId: id,
        detail: `Menghapus PERMANEN barang: ${barangToDelete.label || barangToDelete.labelAset || barangToDelete.merek || "Tanpa Nama"}`,
        userId: session.id
      }
    });

    return NextResponse.json({ message: "Hard deleted" });
  } catch (error: any) {
    if (error?.message?.includes("foreign key constraint") || error?.code === "P2003") {
      return NextResponse.json(
        { error: "Aset tidak bisa dihapus permanen karena masih terikat dengan riwayat peminjaman. Hapus riwayat peminjaman terlebih dahulu." }, 
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
