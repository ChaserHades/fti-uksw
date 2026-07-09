// app/api/barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = new URL(req.url).searchParams;
  const search     = searchParams.get("search")     ?? "";
  const jenisBarangId = searchParams.get("jenisBarangId") ?? "";
  const letakId    = searchParams.get("letakId")    ?? "";
  const kode       = searchParams.get("kode")       ?? "";
  const tersedia   = searchParams.get("tersedia");
  
  const limitParam = searchParams.get("limit");
  const limit      = limitParam === "all" ? undefined : parseInt(limitParam || "50", 10);
  const cursor     = searchParams.get("cursor");
  if (kode) {
    // Try exact match first
    let item = await prisma.barang.findUnique({
      where: { label: kode },
      include: { jenisBarang: true, letak: true },
    });

    // Fallback: case-insensitive search (handles slight differences)
    if (!item) {
      item = await prisma.barang.findFirst({
        where: { label: { equals: kode, mode: "insensitive" } },
        include: { jenisBarang: true, letak: true },
      });
    }

    // Fallback: maybe the QR contains the database ID directly
    if (!item) {
      item = await prisma.barang.findUnique({
        where: { id: kode },
        include: { jenisBarang: true, letak: true },
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
      ...(search     ? { nama: { contains: search, mode: "insensitive" } } : {}),
      ...(jenisBarangId ? { jenisBarangId }                                 : {}),
      ...(letakId    ? { letakId }                                         : {}),
      ...(tersedia === "true" ? { status: "TERSEDIA" }                     : {}),
    },
    include: { jenisBarang: true, letak: true },
    orderBy: (() => {
      const sortBy = searchParams.get("sortBy");
      const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
      if (sortBy === "jenisBarangId") return { jenisBarang: { nama: sortDir } };
      if (sortBy === "letakId") return { letak: { kode: sortDir } };
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
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
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
      jumlah:     body.jumlah ? Number(body.jumlah) : 1,
      tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
      tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
      harga:      body.harga ? Number(body.harga) : null,
      hasSticker: body.hasSticker ?? false,
      letakId:    body.letakId  ?? null,
      jenisBarangId: body.jenisBarangId,
    },
    include: { jenisBarang: true, letak: true },
  });

  return NextResponse.json(item, { status: 201 });
}