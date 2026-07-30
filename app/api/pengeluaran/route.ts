
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";


export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const jenis = searchParams.get("jenis");
  const search = searchParams.get("search") || "";
  
  const limit  = parseInt(searchParams.get("limit") || "50", 10);
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

  const list = await prisma.pengeluaran.findMany({
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where,
    orderBy: { tanggal: "desc" },
    include: { user: true },
  });

  let nextCursor: string | null = null;
  if (list.length > limit) {
    list.pop(); // Remove the extra item
    nextCursor = list[list.length - 1].id;
  }

  return NextResponse.json({ data: list, nextCursor });
}

/** Allowed file extensions for nota/invoice upload */
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"];

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const judul        = formData.get("judul") as string;
  const namaBarang   = (formData.get("namaBarang") as string | null) || null;
  const progdi       = (formData.get("progdi") as string | null) || null;
  const deskripsi    = (formData.get("deskripsi") as string | null) || null;
  const nominal      = parseFloat(formData.get("nominal") as string);
  const tanggal      = formData.get("tanggal") as string;
  const jenis        = formData.get("jenis") as string;
  const jenisBukti   = (formData.get("jenisBukti") as string | null) || null;
  const nomorBukti   = (formData.get("nomorBukti") as string | null) || null;
  const notas        = formData.getAll("nota") as File[];
  const pembelianKeRaw = formData.get("pembelianKe") as string | null;

  if (!judul?.trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  if (isNaN(nominal) || nominal <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  if (!tanggal) return NextResponse.json({ error: "Tanggal wajib diisi" }, { status: 400 });
  if (!["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis))
    return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });

  // Generate kodePembelian: mmyyyy-nnn (Sebagai wadah/kelompok pembelian)
  let kodePembelian: string | null = null;
  let pembelianKe: number | null = null;
  let kelompokPembelianId: string | null = null;

  if (pembelianKeRaw && !isNaN(parseInt(pembelianKeRaw, 10))) {
    pembelianKe = parseInt(pembelianKeRaw, 10);
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

  const barangIdsStr = formData.get("barangIds") as string | null;
  const barangIds: string[] = barangIdsStr ? JSON.parse(barangIdsStr) : [];

  const uploadedUrls: string[] = [];
  if (notas && notas.length > 0) {
    for (const nota of notas) {
      if (nota.size === 0) continue;
      const ext = (nota.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Format file .${ext} tidak didukung. Gunakan: ${ALLOWED_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }
      
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
      namaBarang,
      progdi,
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
    include: { user: true },
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
