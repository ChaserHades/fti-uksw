// app/api/pengeluaran/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get("jenis");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (jenis && ["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis)) {
    where.jenis = jenis;
  }

  const list = await prisma.pengeluaran.findMany({
    where,
    include: { user: true },
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const judul     = formData.get("judul") as string;
  const deskripsi = formData.get("deskripsi") as string | null;
  const nominal   = parseFloat(formData.get("nominal") as string);
  const tanggal   = formData.get("tanggal") as string;
  const jenis     = formData.get("jenis") as string;
  const nota      = formData.get("nota") as File | null;

  if (!judul?.trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  if (isNaN(nominal) || nominal <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  if (!tanggal) return NextResponse.json({ error: "Tanggal wajib diisi" }, { status: 400 });
  if (!["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"].includes(jenis))
    return NextResponse.json({ error: "Jenis tidak valid" }, { status: 400 });

  let notaUrl: string | null = null;
  if (nota && nota.size > 0) {
    const uploadDir = join(process.cwd(), "public", "uploads", "nota");
    await mkdir(uploadDir, { recursive: true });
    const ext = nota.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await nota.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);
    notaUrl = `/uploads/nota/${filename}`;
  }

  const pengeluaran = await prisma.pengeluaran.create({
    data: {
      judul: judul.trim(),
      deskripsi: deskripsi?.trim() || null,
      nominal,
      tanggal: new Date(tanggal),
      jenis: jenis as "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA",
      notaUrl,
      userId: session.id,
    },
    include: { user: true },
  });

  return NextResponse.json(pengeluaran, { status: 201 });
}
