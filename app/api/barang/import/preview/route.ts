import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseBarangExcel } from "@/lib/excel-parser";

/**
 * Detects values that are anomalous — purely symbols, single non-alpha chars,
 * invisible characters, or otherwise not a meaningful "Kategori" name.
 */
function isAnomalousValue(str: string): boolean {
  if (!str) return true;
  const trimmed = str.trim();
  if (trimmed.length === 0) return true;

  // Strip all non-alphanumeric characters; if nothing remains, it's anomalous
  const alphanumericOnly = trimmed.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "");
  if (alphanumericOnly.length < 2) return true;

  // Detect strings that are just repeated punctuation/symbols
  const symbolRatio = (trimmed.length - alphanumericOnly.length) / trimmed.length;
  if (symbolRatio > 0.8 && trimmed.length > 2) return true;

  return false;
}

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
    const seenLabels = new Set<string>();

    // Helper to sanitize labels the same way the push route does
    const sanitizeUnique = (val: any) => {
      if (!val) return null;
      const str = String(val).trim();
      if (str === "-" || str.toLowerCase() === "tanpa nama") return null;
      return str;
    };

    rawData.forEach((row, index) => {
      const draftRow = { ...row, sumberTahun, _rowNumber: index + 3 }; // +3 is an estimate of excel row
      const safeLabel = sanitizeUnique(draftRow.label);

      let hasError = false;

      if (!draftRow.kategori || draftRow.kategori.trim() === "") {
        error.push({ ...draftRow, _errorReason: "Kolom Kategori tidak boleh kosong atau hilang." });
        hasError = true;
      } else if (isAnomalousValue(draftRow.kategori)) {
        error.push({
          ...draftRow,
          _errorReason: `Kategori tidak valid: "${draftRow.kategori}" — hanya berisi simbol atau karakter aneh`,
        });
        hasError = true;
      }
      
      if (!hasError && safeLabel) {
        if (seenLabels.has(safeLabel)) {
          error.push({
            ...draftRow,
            _errorReason: `Data duplikat terdeteksi di dalam file Excel: Label "${safeLabel}" muncul lebih dari 1 kali.`,
          });
          hasError = true;
        } else {
          seenLabels.add(safeLabel);
        }
      }

      if (!hasError) {
        valid.push(draftRow);
      }
    });

    return NextResponse.json({ valid, error, sumberTahun, total: rawData.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal memproses file" }, { status: 500 });
  }
}
