// app/api/transaksi/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");

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

  const list = await prisma.transaksi.findMany({
    where,
    include: {
      barang: { include: { kategori: true, ruangan: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { barangId, namaPeminjam, ruanganPinjam, deadlineKembali, catatan } = await req.json();

  if (!namaPeminjam?.trim())
    return NextResponse.json({ error: "Nama peminjam wajib diisi" }, { status: 400 });
  if (!ruanganPinjam?.trim())
    return NextResponse.json({ error: "Ruangan wajib diisi" }, { status: 400 });
  if (!deadlineKembali)
    return NextResponse.json({ error: "Deadline kembali wajib diisi" }, { status: 400 });

  const barang = await prisma.barang.findUnique({ where: { id: barangId } });
  if (!barang || barang.status !== "TERSEDIA")
    return NextResponse.json({ error: "Barang tidak tersedia" }, { status: 400 });

  const [transaksi] = await prisma.$transaction([
    prisma.transaksi.create({
      data: {
        barangId,
        userId:          session.id,
        namaPeminjam:    namaPeminjam.trim(),
        ruanganPinjam:   ruanganPinjam.trim(),
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

  return NextResponse.json(transaksi, { status: 201 });
}