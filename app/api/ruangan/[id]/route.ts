// app/api/ruangan/[id]/route.ts
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
  const item = await prisma.ruangan.update({
    where: { id },
    data: { kode: body.kode, nama: body.nama, lantai: body.lantai ?? null },
  });

  await prisma.logAktivitas.create({
    data: {
      aksi: "UPDATE",
      entitas: "RUANGAN",
      entitasId: item.id,
      detail: `Memperbarui ruangan: ${item.kode} - ${item.nama}`,
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
  const ruanganToDelete = await prisma.ruangan.findUnique({ where: { id } });
  if (!ruanganToDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // BUG-008 fix: Cek apakah masih ada barang aktif di ruangan ini
  const barangCount = await prisma.barang.count({ where: { ruanganId: id, deletedAt: null } });
  if (barangCount > 0) {
    return NextResponse.json(
      { error: `Ruangan tidak bisa dihapus karena masih memiliki ${barangCount} aset aktif. Pindahkan atau hapus aset tersebut terlebih dahulu.` },
      { status: 409 }
    );
  }

  await prisma.ruangan.delete({ where: { id } });

  await prisma.logAktivitas.create({
    data: {
      aksi: "DELETE",
      entitas: "RUANGAN",
      entitasId: id,
      detail: `Menghapus ruangan: ${ruanganToDelete.kode} - ${ruanganToDelete.nama}`,
      userId: session.id
    }
  });

  return NextResponse.json({ message: "Deleted" });
}
