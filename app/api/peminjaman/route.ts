// app/api/peminjaman/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { publicUserSelect } from "@/lib/public-user";
import { isLoanLate, lateLoanFilter } from "@/helpers/peminjaman";
import { peminjamanInput, peminjamanQuery } from "@/lib/peminjaman-input";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const query = peminjamanQuery.safeParse({
    status: searchParams.get("status") || "",
    limit: searchParams.get("limit") || "50",
  });
  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0].message }, { status: 400 });
  }
  const { status, limit } = query.data;
  const userId = searchParams.get("userId");
  
  const cursor = searchParams.get("cursor");

  const search = searchParams.get("search");
  const now = new Date();

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (userId) where.userId = userId;

  if (status === "TERLAMBAT") {
    // AND menjaga filter keterlambatan saat pencarian juga memakai OR.
    where.AND = [lateLoanFilter(now)];
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
        user: { select: publicUserSelect },
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

  const data = list.map(loan => ({ ...loan, terlambat: isLoanLate(loan, now) }));
  return NextResponse.json({ data, nextCursor, totalCount });
}

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN" && session.role !== "TEKNISI") {
    return NextResponse.json({ error: "Forbidden: Hanya teknisi atau admin yang dapat memproses peminjaman" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body permintaan harus berupa JSON yang valid" }, { status: 400 });
  }
  const input = peminjamanInput.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0].message }, { status: 400 });
  }
  const { barangId, namaPeminjam, ruanganTujuan, deadlineKembali, catatan } = input.data;

  const result = await prisma.$transaction(async (tx) => {
    // Pembaruan bersyarat memastikan hanya satu transaksi dapat mengambil barang.
    const claimed = await tx.barang.updateMany({
      where: { id: barangId, status: "TERSEDIA", deletedAt: null },
      data: { status: "DIPINJAM" },
    });
    if (claimed.count === 0) {
      const barang = await tx.barang.findUnique({ where: { id: barangId } });
      if (!barang || barang.deletedAt !== null) {
        return { error: "Barang tidak ditemukan atau sudah dihapus", status: 400 };
      }
      return {
        error: "Barang sudah dipinjam atau tidak lagi tersedia. Muat ulang data sebelum mencoba lagi.",
        status: 409,
      };
    }

    const p = await tx.peminjaman.create({
      data: {
        barangId,
        userId:          session.id,
        namaPeminjam,
        ruanganTujuan,
        deadlineKembali: new Date(deadlineKembali),
        catatan:         catatan ?? null,
        status:          "AKTIF",
        terlambat:       false,
      },
      include: {
        barang: { include: { kategori: true, ruangan: true } },
        user: { select: publicUserSelect },
      },
    });

    await tx.logAktivitas.create({
      data: {
        aksi: "CREATE",
        entitas: "PEMINJAMAN",
        entitasId: p.id,
        detail: `Meminjamkan ${p.barang.label || p.barang.labelAset || p.barang.merek || "barang"} kepada ${p.namaPeminjam}`,
        userId: session.id,
      }
    });

    return { peminjaman: p };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.peminjaman, { status: 201 });
}
