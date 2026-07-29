// app/api/barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { resolveKategori, resolveRuangan } from "@/lib/resolveRelations";

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
    ],
  };

  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  // ── Resolve orderBy ──
  const orderBy = (() => {
    if (sortBy === "namaBarang") return [{ namaBarang: sortDir }, { id: 'asc' as const }];
    if (sortBy === "kategoriId") return [{ kategori: { nama: sortDir } }, { id: 'asc' as const }];
    if (sortBy === "ruanganId") return [{ ruangan: { kode: sortDir } }, { id: 'asc' as const }];
    if (sortBy === "merek" || sortBy === "harga") return [{ [sortBy]: sortDir }, { id: 'asc' as const }];
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

  try {
    const item = await prisma.barang.create({
      data: {
        namaBarang: body.namaBarang || null,
        progdi: body.progdi || null,
        label: body.label || null,
        labelAset: body.labelAset || null,
        sn: body.sn || null,
        merek: body.merek || null,
        model: body.model || null,
        tipe: body.tipe || null,
        vendor: body.vendor || null,
        keterangan: body.keterangan || null,
        kondisi: body.kondisi || "BAIK",
        status: body.status || "TERSEDIA",
        jumlah: jumlah,
        tanggalDatang: body.tanggalDatang ? new Date(body.tanggalDatang) : null,
        tanggalPindah: body.tanggalPindah ? new Date(body.tanggalPindah) : null,
        harga: harga,
        pembelianKe: body.pembelianKe ? Number(body.pembelianKe) : null,
        hasSticker: body.hasSticker ?? false,
        sumberTahun: body.sumberTahun || null,
        ruanganId,
        kategoriId,
      },
      include: { kategori: true, ruangan: true },
    });

    await prisma.logAktivitas.create({
      data: {
        aksi: "CREATE",
        entitas: "BARANG",
        entitasId: item.id,
        detail: `Menambahkan barang baru: ${item.namaBarang || item.label || item.merek || "Tanpa Nama"}`,
        userId: session.id
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Kode Barang (Label) sudah digunakan, gunakan label lain." }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Terjadi kesalahan pada server" }, { status: 500 });
  }
}