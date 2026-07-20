// app/api/barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { resolveKategori, resolveRuangan } from "@/lib/resolveRelations";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const search     = searchParams.get("search")     ?? "";
  const kategoriId = searchParams.get("kategoriId") ?? "";
  const ruanganId    = searchParams.get("ruanganId")    ?? "";
  const kode       = searchParams.get("kode")       ?? "";
  const tersedia   = searchParams.get("tersedia");
  
  const limitParam = searchParams.get("limit");
  const limit      = limitParam === "all" ? undefined : parseInt(limitParam || "50", 10);
  const cursor     = searchParams.get("cursor");
  if (kode) {
    // Try exact match first
    let item = await prisma.barang.findUnique({
      where: { label: kode },
      include: { kategori: true, ruangan: true },
    });

    // Fallback: case-insensitive search (handles slight differences)
    if (!item) {
      item = await prisma.barang.findFirst({
        where: { label: { equals: kode, mode: "insensitive" } },
        include: { kategori: true, ruangan: true },
      });
    }

    // Fallback: maybe the QR contains the database ID directly
    if (!item) {
      item = await prisma.barang.findUnique({
        where: { id: kode },
        include: { kategori: true, ruangan: true },
      });
    }

    if (!item) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    return NextResponse.json(item);
  }

  const list = await prisma.barang.findMany({
    take: limit !== undefined ? limit + 1 : undefined,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      AND: [
        // Multi-field search: nama, label, labelAset, kategori.nama
        ...(search ? [{
          OR: [
            { nama: { contains: search, mode: "insensitive" as const } },
            { label: { contains: search, mode: "insensitive" as const } },
            { labelAset: { contains: search, mode: "insensitive" as const } },
            { kategori: { nama: { contains: search, mode: "insensitive" as const } } },
          ],
        }] : []),
        ...(kategoriId ? [{ kategoriId }] : []),
        ...(ruanganId  ? [{ ruanganId }]  : []),
        ...(tersedia === "true" ? [{ status: "TERSEDIA" as const }] : []),
      ],
    },
    include: { kategori: true, ruangan: true },
    orderBy: (() => {
      const sortBy = searchParams.get("sortBy");
      const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
      if (sortBy === "kategoriId") return { kategori: { nama: sortDir } };
      if (sortBy === "ruanganId") return { ruangan: { kode: sortDir } };
      if (sortBy === "merek" || sortBy === "tanggalDatang" || sortBy === "harga") return { [sortBy]: sortDir };
      return { createdAt: "desc" };
    })(),
  });

  let nextCursor: string | null = null;
  if (limit !== undefined && list.length > limit) {
    const nextItem = list.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({ data: list, nextCursor });
}

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const kategoriId = await resolveKategori(body.kategoriId);
  if (!kategoriId) return NextResponse.json({ error: "Kategori wajib diisi" }, { status: 400 });
  const ruanganId = await resolveRuangan(body.ruanganId);

  const jumlah = body.jumlah ? Number(body.jumlah) : 1;
  const harga = body.harga ? Number(body.harga) : null;

  if (jumlah < 1) return NextResponse.json({ error: "Jumlah barang tidak valid (minimal 1)" }, { status: 400 });
  if (harga !== null && harga < 0) return NextResponse.json({ error: "Harga barang tidak valid (tidak boleh minus)" }, { status: 400 });

  const item = await prisma.barang.create({
    data: {
      label:      body.label,
      labelAset:  body.labelAset || null,
      nama:       body.nama,
      sn:         body.sn || null,
      merek:      body.merek || null,
      model:      body.model || null,
      tipe:       body.tipe || null,
      vendor:     body.vendor || null,
      keterangan: body.keterangan || null,
      kondisi:    body.kondisi || "BAIK",
      status:     body.status || "TERSEDIA",
      jumlah:     jumlah,
      tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
      tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
      harga:      harga,
      hasSticker: body.hasSticker ?? false,
      sumberTahun: body.sumberTahun || null,
      ruanganId,
      kategoriId,
    },
    include: { kategori: true, ruangan: true },
  });

  return NextResponse.json(item, { status: 201 });
}