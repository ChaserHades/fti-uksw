import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";


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

  const buffer = Buffer.from(await nota.arrayBuffer());
  const base64String = buffer.toString("base64");
  
  let mimeType = "application/octet-stream";
  if (ext === "pdf") mimeType = "application/pdf";
  else if (["jpg", "jpeg"].includes(ext)) mimeType = "image/jpeg";
  else if (ext === "png") mimeType = "image/png";
  else if (ext === "gif") mimeType = "image/gif";
  else if (ext === "webp") mimeType = "image/webp";
  else if (["doc", "docx"].includes(ext)) mimeType = "application/msword";

  const newUrl = `data:${mimeType};base64,${base64String}`;
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

  // We no longer attempt to delete physical files since we use Base64 strings in DB

  return NextResponse.json(updated);
}
