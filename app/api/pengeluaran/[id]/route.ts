import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { publicUserSelect } from "@/lib/public-user";


const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"];

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.pengeluaran.findUnique({
    where: { id },
    include: { user: { select: publicUserSelect }, kelompokPembelian: true, barang: true }
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const judul = formData.get("judul") as string;
    const keterangan = formData.get("keterangan") as string | null;
    const namaBarang = formData.get("namaBarang") as string | null;
    const progdi = formData.get("progdi") as string | null;
    const nominal = Number(formData.get("nominal"));
    const tanggalStr = formData.get("tanggal") as string;
    const jenis = formData.get("jenis") as string;
    const jenisBukti = formData.get("jenisBukti") as string | null;
    const nomorBukti = formData.get("nomorBukti") as string | null;
    const pembelianKe = formData.get("pembelianKe") ? Number(formData.get("pembelianKe")) : null;
    const hasBarangIds = formData.has("barangIds");
    const barangIdsRaw = formData.get("barangIds") as string | null;
    const barangIds: string[] = barangIdsRaw ? JSON.parse(barangIdsRaw) : [];
    
    const notas = formData.getAll("nota") as File[];
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

    let kodePembelian = null;
    let kelompokPembelianId = null;

    if (pembelianKe && tanggalStr) {
      const d = new Date(tanggalStr);
      if (!isNaN(d.getTime())) {
        const { buildPurchaseCode } = await import("@/lib/purchase-code");
        kodePembelian = buildPurchaseCode(d, pembelianKe);

        let kelompok = await prisma.kelompokPembelian.findUnique({
          where: { kode: kodePembelian }
        });
        if (!kelompok) {
          kelompok = await prisma.kelompokPembelian.create({
            data: {
              kode: kodePembelian,
              tanggal: d,
              pembelianKe
            }
          });
        }
        kelompokPembelianId = kelompok.id;
      }
    }

    const updated = await prisma.pengeluaran.update({
      where: { id },
      data: {
        judul,
        namaBarang,
        progdi,
        deskripsi: keterangan || null,
        nominal,
        tanggal: new Date(tanggalStr),
        jenis: jenis as "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA",
        jenisBukti,
        nomorBukti,
        pembelianKe,
        kodePembelian,
        kelompokPembelianId,
        ...(uploadedUrls.length > 0 && {
          notaUrls: {
            push: uploadedUrls
          }
        }),
        ...(hasBarangIds && {
          barang: { set: barangIds.map(bId => ({ id: bId })) }
        })
      }
    });

    if (hasBarangIds && kelompokPembelianId && barangIds.length > 0) {
      await prisma.barang.updateMany({
        where: { id: { in: barangIds } },
        data: { kelompokPembelianId }
      });
    }

    await prisma.logAktivitas.create({
      data: {
        aksi: "UPDATE",
        entitas: "PENGELUARAN",
        entitasId: updated.id,
        detail: `Memperbarui pengeluaran: ${updated.judul}`,
        userId: session.id
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

  const pengeluaranToDelete = await prisma.pengeluaran.findUnique({ where: { id } });
  if (!pengeluaranToDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pengeluaran.delete({ where: { id } });

  await prisma.logAktivitas.create({
    data: {
      aksi: "DELETE",
      entitas: "PENGELUARAN",
      entitasId: id,
      detail: `Menghapus pengeluaran: ${pengeluaranToDelete.judul}`,
      userId: session.id
    }
  });

  return NextResponse.json({ message: "Deleted" });
}
