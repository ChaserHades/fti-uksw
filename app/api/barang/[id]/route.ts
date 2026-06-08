// app/api/barang/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.barang.findUnique({
    where: { id },
    include: { kategori: true, ruangan: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const item = await prisma.barang.update({
    where: { id },
    data: {
      kodeBarang: body.kodeBarang,
      nama: body.nama,
      deskripsi: body.deskripsi ?? null,
      kondisi: body.kondisi,
      jumlah: Number(body.jumlah),
      tahunBeli: body.tahunBeli ? Number(body.tahunBeli) : null,
      harga: body.harga ? Number(body.harga) : null,
      kategoriId: body.kategoriId,
      ruanganId: body.ruanganId ?? null,
    },
    include: { kategori: true, ruangan: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.barang.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
