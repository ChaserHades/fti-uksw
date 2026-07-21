// app/api/peminjaman/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");
  
  const limit  = parseInt(searchParams.get("limit") || "50", 10);
  const cursor = searchParams.get("cursor");

  const search = searchParams.get("search");

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (userId) where.userId = userId;

  if (status === "TERLAMBAT") {
    // Terlambat = pernah melewati deadline (persisten, termasuk yang sudah SELESAI)
    where.terlambat = true;
  } else if (status === "AKTIF" || status === "SELESAI") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { namaPeminjam: { contains: search, mode: "insensitive" } },
      { barang: { kategori: { nama: { contains: search, mode: "insensitive" } } } },
      { barang: { label: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [list, totalCount] = await Promise.all([
    prisma.peminjaman.findMany({
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: {
        barang: { include: { kategori: true, ruangan: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.peminjaman.count({ where }),
  ]);

  let nextCursor: string | null = null;
  if (list.length > limit) {
    list.pop(); // Remove the extra item
    nextCursor = list[list.length - 1].id;
  }

  return NextResponse.json({ data: list, nextCursor, totalCount });
}

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN" && session.role !== "TEKNISI") {
    return NextResponse.json({ error: "Forbidden: Hanya teknisi atau admin yang dapat memproses peminjaman" }, { status: 403 });
  }

  const { barangId, namaPeminjam, ruanganTujuan, deadlineKembali, catatan } = await req.json();

  if (!namaPeminjam?.trim())
    return NextResponse.json({ error: "Nama peminjam wajib diisi" }, { status: 400 });
  if (!ruanganTujuan?.trim())
    return NextResponse.json({ error: "Ruangan wajib diisi" }, { status: 400 });
  if (!deadlineKembali)
    return NextResponse.json({ error: "Deadline kembali wajib diisi" }, { status: 400 });

  const barang = await prisma.barang.findUnique({ where: { id: barangId } });
  if (!barang || barang.status !== "TERSEDIA")
    return NextResponse.json({ error: "Barang tidak tersedia" }, { status: 400 });

  const [peminjaman] = await prisma.$transaction([
    prisma.peminjaman.create({
      data: {
        barangId,
        userId:          session.id,
        namaPeminjam:    namaPeminjam.trim(),
        ruanganTujuan:     ruanganTujuan.trim(),
        deadlineKembali: new Date(deadlineKembali),
        catatan:         catatan ?? null,
        status:          "AKTIF",
        terlambat:       false,
      },
      include: {
        barang: { include: { kategori: true, ruangan: true } },
        user: true,
      },
    }),
    prisma.barang.update({ where: { id: barangId }, data: { status: "DIPINJAM" } }),
  ]);

  return NextResponse.json(peminjaman, { status: 201 });
}