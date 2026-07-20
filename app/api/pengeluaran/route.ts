// app/api/pengeluaran/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const jenis = searchParams.get("jenis");
  
  const limit  = parseInt(searchParams.get("limit") || "50", 10);
  const cursor = searchParams.get("cursor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (jenis && ["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis)) {
    where.jenis = jenis;
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
    const nextItem = list.pop();
    nextCursor = nextItem!.id;
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
  const judul     = formData.get("judul") as string;
  const deskripsi = formData.get("deskripsi") as string | null;
  const nominal   = parseFloat(formData.get("nominal") as string);
  const tanggal   = formData.get("tanggal") as string;
  const jenis     = formData.get("jenis") as string;
  const notas     = formData.getAll("nota") as File[];
  const pembelianKeRaw = formData.get("pembelianKe") as string | null;

  if (!judul?.trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  if (isNaN(nominal) || nominal <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  if (!tanggal) return NextResponse.json({ error: "Tanggal wajib diisi" }, { status: 400 });
  if (!["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis))
    return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });

  // --- Generate kodePembelian from tanggal + pembelianKe ---
  let kodePembelian: string | null = null;
  let pembelianKe: number | null = null;

  if (pembelianKeRaw && !isNaN(parseInt(pembelianKeRaw, 10))) {
    pembelianKe = parseInt(pembelianKeRaw, 10);
    const d = new Date(tanggal);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    const nnn = String(pembelianKe).padStart(3, "0");
    kodePembelian = `${mm}${yyyy}-${nnn}`;
  }

  // --- Handle files upload (jpg, pdf, docx, etc.) ---
  const uploadedUrls: string[] = [];
  if (notas && notas.length > 0) {
    const uploadDir = join(process.cwd(), "public", "uploads", "nota");
    await mkdir(uploadDir, { recursive: true });

    for (const nota of notas) {
      if (nota.size === 0) continue;
      const ext = (nota.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Format file .${ext} tidak didukung. Gunakan: ${ALLOWED_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await nota.arrayBuffer());
      await writeFile(join(uploadDir, filename), buffer);
      uploadedUrls.push(`/uploads/nota/${filename}`);
    }
  }

  // Jika ada kodePembelian, cek apakah sudah ada record dengan kode tersebut
  if (kodePembelian) {
    const existing = await prisma.pengeluaran.findFirst({
      where: { kodePembelian }
    });

    if (existing) {
      // Append notas to existing record
      const updated = await prisma.pengeluaran.update({
        where: { id: existing.id },
        data: {
          notaUrls: {
            push: uploadedUrls
          }
        },
        include: { user: true },
      });
      return NextResponse.json(updated, { status: 200 }); // 200 OK because we updated
    }
  }

  // Jika tidak ada kodePembelian atau belum ada record, create baru
  const pengeluaran = await prisma.pengeluaran.create({
    data: {
      judul: judul.trim(),
      deskripsi: deskripsi?.trim() || null,
      nominal,
      tanggal: new Date(tanggal),
      jenis: jenis as "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA",
      notaUrls: uploadedUrls,
      kodePembelian,
      pembelianKe,
      userId: session.id,
    },
    include: { user: true },
  });

  return NextResponse.json(pengeluaran, { status: 201 });
}
