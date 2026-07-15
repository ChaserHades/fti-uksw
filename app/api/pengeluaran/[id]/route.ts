import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"];

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const judul = formData.get("judul") as string;
    const keterangan = formData.get("keterangan") as string | null;
    const nominal = Number(formData.get("nominal"));
    const tanggalStr = formData.get("tanggal") as string;
    const jenis = formData.get("jenis") as string;
    const pembelianKe = formData.get("pembelianKe") ? Number(formData.get("pembelianKe")) : null;
    
    const notas = formData.getAll("nota") as File[];
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

    let kodePembelian = null;
    if (pembelianKe && tanggalStr) {
      const d = new Date(tanggalStr);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = String(d.getFullYear());
        const nnn = String(pembelianKe).padStart(3, "0");
        kodePembelian = `${mm}${yyyy}-${nnn}`;
      }
    }

    const updated = await prisma.pengeluaran.update({
      where: { id },
      data: {
        judul,
        deskripsi: keterangan || null,
        nominal,
        tanggal: new Date(tanggalStr),
        jenis: jenis as "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA",
        pembelianKe,
        kodePembelian,
        ...(uploadedUrls.length > 0 && {
          notaUrls: {
            push: uploadedUrls
          }
        })
      }
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal update" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.pengeluaran.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
