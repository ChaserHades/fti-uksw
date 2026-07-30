// app/api/barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { resolveKategori, resolveRuangan } from "@/lib/resolveRelations";

import { assessBarangIdentity } from "@/lib/barang-identity";

/**
 * Membangun data Barang dari body request.
 * Reusable untuk POST dan retry P2002.
 */
function buildBarangData(body: any, options: {
  finalLabel: string | null | undefined;
  kategoriId: string;
  ruanganId: string | null;
  kelompokPembelianId: string | null;
  jumlah: number;
  harga: number | null;
}) {
  return {
    kelompokPembelianId: options.kelompokPembelianId,
    namaBarang: body.namaBarang || null,
    progdi: body.progdi || null,
    label: options.finalLabel || null,
    labelAset: body.labelAset || null,
    sn: body.sn || null,
    merek: body.merek || null,
    model: body.model || null,
    tipe: body.tipe || null,
    vendor: body.vendor || null,
    keterangan: body.keterangan || null,
    kondisi: body.kondisi || "BAIK",
    status: body.status || "TERSEDIA",
    jumlah: options.jumlah,
    tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
    tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
    harga: options.harga,
    pembelianKe: body.pembelianKe ? Number(body.pembelianKe) : null,
    hasSticker: !!(options.finalLabel || body.labelAset || body.sn),
    sumberTahun: body.sumberTahun || null,
    ruanganId: options.ruanganId,
    kategoriId: options.kategoriId,
    pengeluaranId: body.pengeluaranId || null,
  };
}

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const search = searchParams.get("search") ?? "";
  const kategoriId = searchParams.get("kategoriId") ?? "";
  const ruanganId = searchParams.get("ruanganId") ?? "";
  const kode = searchParams.get("kode") ?? "";
  const tersedia = searchParams.get("tersedia");

  const limitParam = searchParams.get("limit");
  const limit = limitParam === "all" ? undefined : parseInt(limitParam || "50", 10);
  const cursor = searchParams.get("cursor");

  // ── Single-item lookup by kode (QR scan, etc.) ──
  if (kode) {
    // Try exact match first (by internal ID)
    let item = await prisma.barang.findUnique({
      where: { id: kode },
      include: { kategori: true, ruangan: true },
    });

    if (item) {
      return NextResponse.json(item);
    }

    // Legacy lookup by label
    const legacyMatches = await prisma.barang.findMany({
      where: { label: kode },
      include: { kategori: true, ruangan: true },
    });

    if (legacyMatches.length === 1) {
      return NextResponse.json(legacyMatches[0]);
    } else if (legacyMatches.length > 1) {
      return NextResponse.json({ error: "Ambigu: Beberapa aset menggunakan label legacy ini. Scan QR terbaru untuk keakuratan." }, { status: 409 });
    }

    // Fallback: case-insensitive search (handles slight differences)
    const fallbackMatches = await prisma.barang.findMany({
      where: { label: { equals: kode, mode: "insensitive" } },
      include: { kategori: true, ruangan: true },
    });
    
    if (fallbackMatches.length === 1) {
      return NextResponse.json(fallbackMatches[0]);
    } else if (fallbackMatches.length > 1) {
      return NextResponse.json({ error: "Ambigu: Beberapa aset menggunakan label legacy ini." }, { status: 409 });
    }

    return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
  }

  // ── Build shared where clause ──
  const where = {
    AND: [
      // Multi-field search: namaBarang, label, labelAset, merek, kategori.nama
      ...(search ? [{
        OR: [
          { namaBarang: { contains: search, mode: "insensitive" as const } },
          { label: { contains: search, mode: "insensitive" as const } },
          { labelAset: { contains: search, mode: "insensitive" as const } },
          { merek: { contains: search, mode: "insensitive" as const } },
          { kategori: { nama: { contains: search, mode: "insensitive" as const } } },
        ],
      }] : []),
      ...(kategoriId ? [{ kategoriId }] : []),
      ...(ruanganId ? [{ ruanganId }] : []),
      ...(tersedia === "true" ? [{ status: "TERSEDIA" as const }] : []),
      ...(searchParams.get("status") === "deleted" 
          ? [{ deletedAt: { not: null } }] 
          : [{ deletedAt: null }]),
    ],
  } as any;

  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  // ── Resolve orderBy ──
  const orderBy = (() => {
    if (sortBy === "namaBarang") return [{ namaBarang: sortDir }, { id: 'asc' as const }];
    if (sortBy === "kategoriId") return [{ kategori: { nama: sortDir } }, { id: 'asc' as const }];
    if (sortBy === "ruanganId") return [{ ruangan: { kode: sortDir } }, { id: 'asc' as const }];
    if (sortBy === "merek" || sortBy === "harga" || sortBy === "pengeluaranId") return [{ [sortBy]: sortDir }, { id: 'asc' as const }];
    if (sortBy === "tanggalDatang") return [{ createdAt: sortDir }, { id: 'asc' as const }];
    return [{ createdAt: "desc" as const }, { id: 'asc' as const }];
  })() as any;

  // ── Run data query + count in parallel ──
  const takeCount = limit !== undefined ? limit * 2 + 1 : undefined;

  const [list, totalCount] = await Promise.all([
    prisma.barang.findMany({
      take: takeCount,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: { kategori: true, ruangan: true },
      orderBy,
    }),
    prisma.barang.count({ where }),
  ]);

  // ── Cursor pagination ──
  let nextCursor: string | null = null;
  let returnedList = list;

  if (limit !== undefined) {
    if (list.length > limit * 2) {
      // Lebih dari 2x limit, berarti masih ada sisa banyak. Kembalikan sesuai limit saja.
      returnedList = list.slice(0, limit);
      nextCursor = list[limit - 1].id;
    } else if (list.length > limit && list.length <= limit * 2) {
      // Sisa data <= limit, kembalikan semuanya sekaligus agar tidak ada "straggler page"
      returnedList = list;
      nextCursor = null;
    } else {
      // Data <= limit
      returnedList = list;
      nextCursor = null;
    }
  }

  return NextResponse.json({ data: returnedList, nextCursor, totalCount });
}

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN" && session.role !== "TEKNISI")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const identity = assessBarangIdentity(body);
  if (!identity.isValid) {
    return NextResponse.json({ error: identity.error }, { status: 400 });
  }

  let kategoriId = await resolveKategori(body.kategoriId);
  if (!kategoriId) {
    // Kategori is empty but Anchor is valid -> fallback to Belum Dikategorikan
    kategoriId = await resolveKategori("Belum Dikategorikan");
    if (!kategoriId) return NextResponse.json({ error: "Gagal memproses kategori fallback" }, { status: 500 });
  }

  const ruanganId = await resolveRuangan(body.ruanganId);

  const jumlah = body.jumlah ? Number(body.jumlah) : 1;
  const harga = body.harga ? Number(body.harga) : null;

  if (jumlah < 1) return NextResponse.json({ error: "Jumlah barang tidak valid (minimal 1)" }, { status: 400 });
  if (harga !== null && harga < 0) return NextResponse.json({ error: "Harga barang tidak valid (tidak boleh minus)" }, { status: 400 });

  // Use normalized labels
  const finalLabel = identity.normalizedData.label;

  // ── Resolve KelompokPembelian (upsert) ──
  let kelompokPembelianId: string | null = null;
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
    }
  }

  // ── Buat Barang + Log dalam satu transaction (atomic) ──
  // Jika salah satu gagal, keduanya di-rollback.
  const attemptCreate = async (label: string | null | undefined) => {
    const data = buildBarangData(body, { finalLabel: label, kategoriId, ruanganId, kelompokPembelianId, jumlah, harga });
    return prisma.$transaction(async (tx) => {
      const item = await tx.barang.create({
        data,
        include: { kategori: true, ruangan: true },
      });
      await tx.logAktivitas.create({
        data: {
          aksi: "CREATE",
          entitas: "BARANG",
          entitasId: item.id,
          detail: `Menambahkan barang baru: ${item.namaBarang || item.label || item.merek || "Tanpa Nama"}`,
          userId: session.id,
        },
      });
      return item;
    });
  };

  try {
    const item = await attemptCreate(finalLabel);
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      // With label unique constraint removed, P2002 on label shouldn't happen.
      // But if there's any other unique constraint, report it.
      return NextResponse.json({ error: "Data gagal disimpan, terdapat duplikasi unique (contoh: id)." }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Terjadi kesalahan saat menyimpan barang" }, { status: 500 });
  }
}