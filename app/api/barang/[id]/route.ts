// app/api/barang/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { resolveKategori, resolveRuangan } from "@/lib/resolveRelations";
import { assessBarangIdentity } from "@/lib/barang-identity";
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
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN" && session.role !== "TEKNISI")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const existingItem = await prisma.barang.findUnique({ where: { id } });
  if (!existingItem) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });

  // Merge incoming body with existing values to validate final state
  const mergedState = {
    namaBarang: body.namaBarang !== undefined ? body.namaBarang : existingItem.namaBarang,
    label: body.label !== undefined ? body.label : existingItem.label,
    labelAset: body.labelAset !== undefined ? body.labelAset : existingItem.labelAset,
  };

  const identity = assessBarangIdentity(mergedState);
  if (!identity.isValid) {
    return NextResponse.json({ error: "Setelah update, barang harus memiliki minimal Nama Barang, Label, atau Label Aset." }, { status: 400 });
  }

  let kategoriId = await resolveKategori(body.kategoriId !== undefined ? body.kategoriId : existingItem.kategoriId);
  if (!kategoriId) {
    kategoriId = await resolveKategori("Belum Dikategorikan");
    if (!kategoriId) return NextResponse.json({ error: "Gagal memproses kategori fallback" }, { status: 500 });
  }

  const ruanganId = await resolveRuangan(body.ruanganId);

  const jumlah = body.jumlah ? Number(body.jumlah) : 1;
  const harga = body.harga ? Number(body.harga) : null;

  if (jumlah < 1) return NextResponse.json({ error: "Jumlah barang tidak valid (minimal 1)" }, { status: 400 });
  if (harga !== null && harga < 0) return NextResponse.json({ error: "Harga barang tidak valid (tidak boleh minus)" }, { status: 400 });

  let kelompokPembelianId = undefined;
  if (body.tanggalDatang !== undefined || body.pembelianKe !== undefined) {
    if (body.tanggalDatang && body.pembelianKe) {
      const d = new Date(body.tanggalDatang);
      const pk = Number(body.pembelianKe);
      if (!isNaN(d.getTime()) && !isNaN(pk)) {
        const { buildPurchaseCode } = await import("@/lib/purchase-code");
        const kode = buildPurchaseCode(d, pk);
        let kelompok = await prisma.kelompokPembelian.findUnique({ where: { kode } });
        if (!kelompok) {
          kelompok = await prisma.kelompokPembelian.create({
            data: { kode, tanggal: d, pembelianKe: pk }
          });
        }
        kelompokPembelianId = kelompok.id;
      } else {
        kelompokPembelianId = null;
      }
    } else {
      kelompokPembelianId = null;
    }
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.barang.update({
        where: { id },
        data: {
          ...(kelompokPembelianId !== undefined && { kelompokPembelianId }),
          namaBarang: body.namaBarang !== undefined ? (body.namaBarang || null) : existingItem.namaBarang,
          progdi: body.progdi !== undefined ? (body.progdi || null) : existingItem.progdi,
          label: identity.normalizedData.label,
          labelAset: identity.normalizedData.labelAset,
          sn: body.sn || null,
          merek: body.merek || null,
          model: body.model || null,
          tipe: body.tipe || null,
          vendor: body.vendor || null,
          keterangan: body.keterangan ?? null,
          kondisi: body.kondisi,
          jumlah: jumlah,
          tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
          tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
          harga: harga,
          sumberTahun: body.sumberTahun || null,
          pembelianKe: body.pembelianKe ? Number(body.pembelianKe) : null,
          kategoriId,
          ruanganId,
          pengeluaranId: body.pengeluaranId || null,
        },
        include: { kategori: true, ruangan: true },
      });

      await tx.logAktivitas.create({
        data: {
          aksi: "UPDATE",
          entitas: "BARANG",
          entitasId: updated.id,
          detail: `Memperbarui barang: ${updated.label || updated.labelAset || updated.merek || "Tanpa Nama"}`,
          userId: session.id,
        },
      });

      return updated;
    });

    return NextResponse.json(item);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Data gagal disimpan, terdapat duplikasi unique (contoh: id)." }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const barangToDelete = await prisma.barang.findUnique({ where: { id } });
    if (!barangToDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.barang.update({ where: { id }, data: { deletedAt: new Date() } });
    
    await prisma.logAktivitas.create({
      data: {
        aksi: "DELETE",
        entitas: "BARANG",
        entitasId: id,
        detail: `Menghapus barang: ${barangToDelete.label || barangToDelete.labelAset || barangToDelete.merek || "Tanpa Nama"}`,
        userId: session.id
      }
    });

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
