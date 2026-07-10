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
      label: body.label,
      labelAset: body.labelAset || null,
      nama: body.nama,
      sn: body.sn || null,
      merek: body.merek || null,
      model: body.model || null,
      tipe: body.tipe || null,
      vendor: body.vendor || null,
      keterangan: body.keterangan ?? null,
      kondisi: body.kondisi,
      jumlah: Number(body.jumlah),
      tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
      tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
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

  try {
    await prisma.barang.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error: any) {
    if (error?.message?.includes("foreign key constraint") || error?.code === "P2003") {
      return NextResponse.json(
        { error: "Aset tidak bisa dihapus karena masih terikat dengan riwayat peminjaman. Sebagai gantinya, ubah status kondisi aset ini." }, 
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
