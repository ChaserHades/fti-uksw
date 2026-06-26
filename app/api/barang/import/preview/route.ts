import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseBarangExcel } from "@/lib/excel-parser";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      return NextResponse.json({ error: "Format harus .xlsx, .xls, atau .csv" }, { status: 400 });
    }

    // Extract year from filename (e.g. "DETAIL ASET 2024.xlsx" -> "2024")
    const yearMatch = file.name.match(/\b(19|20)\d{2}\b/);
    const sumberTahun = yearMatch ? yearMatch[0] : "Tanpa Tahun";

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawData = await parseBarangExcel(buffer);

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data yang terdeteksi di dalam file." },
        { status: 422 }
      );
    }

    // Attach sumberTahun and evaluate valid vs error
    const valid: any[] = [];
    const error: any[] = [];

    rawData.forEach((row, index) => {
      const draftRow = { ...row, sumberTahun, _rowNumber: index + 3 }; // +3 is an estimate of excel row

      // Validasi: wajib ada label / sn / labelAset, ATAU wajib ada Jenis Barang
      if (!draftRow.jenisBarang || draftRow.jenisBarang === "Lainnya") {
        error.push({ ...draftRow, _errorReason: "Jenis Barang kosong atau tidak terdeteksi" });
      } else {
        valid.push(draftRow);
      }
    });

    return NextResponse.json({ valid, error, sumberTahun, total: rawData.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal memproses file" }, { status: 500 });
  }
}
