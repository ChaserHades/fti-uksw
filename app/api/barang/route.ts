// app/api/barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = new URL(req.url).searchParams;
  const search     = searchParams.get("search")     ?? "";
  const kategoriId = searchParams.get("kategoriId") ?? "";
  const kode       = searchParams.get("kode")       ?? "";
  const tersedia   = searchParams.get("tersedia");
  
  const limit      = parseInt(searchParams.get("limit") || "50", 10);
  const cursor     = searchParams.get("cursor");
  if (kode) {
    // Try exact match first
    let item = await prisma.barang.findUnique({
      where: { kodeBarang: kode },
      include: { kategori: true, ruangan: true },
    });

    // Fallback: case-insensitive search (handles slight differences)
    if (!item) {
      item = await prisma.barang.findFirst({
        where: { kodeBarang: { equals: kode, mode: "insensitive" } },
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
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      ...(search     ? { nama: { contains: search, mode: "insensitive" } } : {}),
      ...(kategoriId ? { kategoriId }                                       : {}),
      ...(tersedia === "true" ? { status: "TERSEDIA" }                     : {}),
    },
    include: { kategori: true, ruangan: true },
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | null = null;
  if (list.length > limit) {
    const nextItem = list.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({ data: list, nextCursor });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const item = await prisma.barang.create({
    data: {
      kodeBarang: body.kodeBarang,
      nama:       body.nama,
      serialNumber: body.serialNumber || null,
      merek:      body.merek || null,
      tipe:       body.tipe || null,
      vendor:     body.vendor || null,
      deskripsi:  body.deskripsi || null,
      kondisi:    body.kondisi || "BAIK",
      status:     body.status || "TERSEDIA",
      jumlah:     body.jumlah ? Number(body.jumlah) : 1,
      tanggalBeli: body.tanggalBeli ? new Date(body.tanggalBeli) : null,
      harga:      body.harga ? Number(body.harga) : null,
      hasSticker: body.hasSticker ?? false,
      ruanganId:  body.ruanganId  ?? null,
      kategoriId: body.kategoriId,
    },
    include: { kategori: true, ruangan: true },
  });

  return NextResponse.json(item, { status: 201 });
}