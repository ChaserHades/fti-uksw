import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const pengeluaran = await prisma.pengeluaran.findUnique({ where: { id } });
  if (!pengeluaran) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const formData = await req.formData();
  const nota = formData.get("nota") as File | null;
  if (!nota || nota.size === 0) return NextResponse.json({ error: "File nota tidak ditemukan" }, { status: 400 });

  const ext = (nota.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `Format file .${ext} tidak didukung` }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "nota");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await nota.arrayBuffer());
  await writeFile(join(uploadDir, filename), buffer);
  const newUrl = `/uploads/nota/${filename}`;

  const updated = await prisma.pengeluaran.update({
    where: { id },
    data: { notaUrls: { push: newUrl } },
    include: { user: true }
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL nota wajib diisi" }, { status: 400 });

  const pengeluaran = await prisma.pengeluaran.findUnique({ where: { id } });
  if (!pengeluaran) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const newUrls = pengeluaran.notaUrls.filter(u => u !== url);

  const updated = await prisma.pengeluaran.update({
    where: { id },
    data: { notaUrls: { set: newUrls } },
    include: { user: true }
  });

  // Attempt to delete physical file
  try {
    const filename = url.replace("/uploads/nota/", "");
    const filepath = join(process.cwd(), "public", "uploads", "nota", filename);
    await unlink(filepath);
  } catch (e) {
    console.error("Failed to delete physical file", e);
  }

  return NextResponse.json(updated);
}
