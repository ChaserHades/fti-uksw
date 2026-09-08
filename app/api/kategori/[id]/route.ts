// app/api/kategori/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.kategori.update({ where: { id }, data: body });

  await prisma.logAktivitas.create({
    data: {
      aksi: "UPDATE",
      entitas: "KATEGORI",
      entitasId: item.id,
      detail: `Memperbarui kategori: ${item.nama}`,
      userId: session.id
    }
  });

  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const kategoriToDelete = await prisma.kategori.findUnique({ where: { id } });
  if (!kategoriToDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // BUG-009 fix: Cek apakah masih ada barang aktif yang menggunakan kategori ini
  const barangCount = await prisma.barang.count({ where: { kategoriId: id, deletedAt: null } });
  if (barangCount > 0) {
    return NextResponse.json(
      { error: `Kategori tidak bisa dihapus karena masih digunakan oleh ${barangCount} aset aktif. Ubah kategori aset tersebut terlebih dahulu.` },
      { status: 409 }
    );
  }

  await prisma.kategori.delete({ where: { id } });

  await prisma.logAktivitas.create({
    data: {
      aksi: "DELETE",
      entitas: "KATEGORI",
      entitasId: id,
      detail: `Menghapus kategori: ${kategoriToDelete.nama}`,
      userId: session.id
    }
  });

  return NextResponse.json({ message: "Deleted" });
}
