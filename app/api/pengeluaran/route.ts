
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { publicUserSelect } from "@/lib/public-user";
import { pengeluaranQuery, readPengeluaranInput } from "@/lib/pengeluaran-input";


export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const query = pengeluaranQuery.safeParse({
    jenis: searchParams.get("jenis") || "",
    limit: searchParams.get("limit") || "50",
  });
  if (!query.success) return NextResponse.json({ error: query.error.issues[0].message }, { status: 400 });
  const { jenis, limit } = query.data;
  const search = searchParams.get("search") || "";
  
  const cursor = searchParams.get("cursor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (jenis && ["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis)) {
    where.jenis = jenis;
  }
  
  if (search) {
    where.OR = [
      { judul: { contains: search, mode: "insensitive" } },
      { kodePembelian: { contains: search, mode: "insensitive" } },
      { nomorBukti: { contains: search, mode: "insensitive" } },
    ];
  }

  const [list, totalCount] = await Promise.all([
    prisma.pengeluaran.findMany({
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy: { tanggal: "desc" },
      include: { user: { select: publicUserSelect } },
    }),
    prisma.pengeluaran.count({ where }),
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
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = await readPengeluaranInput(req);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  const { judul, namaBarang, progdi, deskripsi, nominal, tanggal, jenis,
    jenisBukti, nomorBukti, notas, pembelianKe, barangIds } = input.data;

  // Generate kodePembelian: mmyyyy-nnn (Sebagai wadah/kelompok pembelian)
  let kodePembelian: string | null = null;
  let kelompokPembelianId: string | null = null;

  if (pembelianKe !== null) {
    const { buildPurchaseCode } = await import("@/lib/purchase-code");
    kodePembelian = buildPurchaseCode(tanggal, pembelianKe);
    
    // Find or create KelompokPembelian
    let kelompok = await prisma.kelompokPembelian.findUnique({
      where: { kode: kodePembelian }
    });
    if (!kelompok) {
      kelompok = await prisma.kelompokPembelian.create({
        data: {
          kode: kodePembelian,
          tanggal: new Date(tanggal),
          pembelianKe
        }
      });
    }
    kelompokPembelianId = kelompok.id;
  }

  const uploadedUrls: string[] = [];
  if (notas && notas.length > 0) {
    for (const nota of notas) {
      if (nota.size === 0) continue;
      const ext = (nota.name.split(".").pop() ?? "").toLowerCase();
      
      const buffer = Buffer.from(await nota.arrayBuffer());
      const base64String = buffer.toString("base64");
      
      let mimeType = "application/octet-stream";
      if (ext === "pdf") mimeType = "application/pdf";
      else if (["jpg", "jpeg"].includes(ext)) mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "gif") mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (["doc", "docx"].includes(ext)) mimeType = "application/msword";

      const dataUrl = `data:${mimeType};base64,${base64String}`;
      uploadedUrls.push(dataUrl);
    }
  }

  const pengeluaran = await prisma.pengeluaran.create({
    data: {
      judul: judul.trim(),
      namaBarang: namaBarang || null,
      progdi: progdi || null,
      deskripsi: deskripsi?.trim() || null,
      nominal,
      tanggal: new Date(tanggal),
      jenis: jenis as "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA",
      jenisBukti: jenisBukti || null,
      nomorBukti: nomorBukti || null,
      notaUrls: uploadedUrls,
      kodePembelian,
      pembelianKe,
      userId: session.id,
      kelompokPembelianId,
      ...(barangIds.length > 0 ? { barang: { connect: barangIds.map(id => ({ id })) } } : {})
    },
    include: { user: { select: publicUserSelect } },
  });

  if (kelompokPembelianId && barangIds.length > 0) {
    await prisma.barang.updateMany({
      where: { id: { in: barangIds } },
      data: { kelompokPembelianId }
    });
  }

  await prisma.logAktivitas.create({
    data: {
      aksi: "CREATE",
      entitas: "PENGELUARAN",
      entitasId: pengeluaran.id,
      detail: `Menambahkan cashflow baru: ${pengeluaran.judul}`,
      userId: session.id
    }
  });

  return NextResponse.json(pengeluaran, { status: 201 });
}
