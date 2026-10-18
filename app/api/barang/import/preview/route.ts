import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { parseBarangExcel } from "@/lib/excel-parser";
import { assessImportBarangIdentity } from "@/lib/import-barang-identity";

/**
 * Detects anomalous values (symbols, invisible chars)
 */
function isAnomalousValue(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (trimmed.length === 0) return true;

  // Strip non-alphanumeric chars
  const alphanumericOnly = trimmed.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "");
  if (alphanumericOnly.length < 2) return true;

  // Detect high symbol ratio
  const symbolRatio = (trimmed.length - alphanumericOnly.length) / trimmed.length;
  if (symbolRatio > 0.8 && trimmed.length > 2) return true;

  return false;
}

export async function POST(req: Request) {
  const { session, error: authError } = await checkApiAuth();
  if (authError) return authError;
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      return NextResponse.json({ error: "Format harus Excel (.xlsx)" }, { status: 400 });
    }

    // Extract year from filename (e.g. "DETAIL ASET 2024.xlsx" to "2024")
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

    const valid: any[] = [];
    const error: any[] = [];

    rawData.forEach((row, index) => {
      const draftRow = { ...row, sumberTahun, _rowNumber: index + 3 }; // +3 is an estimate of excel row

      let hasError = false;
      let errorReason = "";

      // 1. Preserve conflict error from parser
      if (draftRow.conflictError) {
        hasError = true;
        errorReason = draftRow.conflictError;
      }
      // 2. Check for anomalous kategori (if present)
      else if (draftRow.kategori && isAnomalousValue(draftRow.kategori)) {
        hasError = true;
        errorReason = `Kategori tidak valid: "${draftRow.kategori}" (hanya berisi simbol atau karakter aneh)`;
      }
      // 3. Identity validation
      else {
        const assessment = assessImportBarangIdentity(draftRow);
        if (!assessment.isValid) {
          hasError = true;
          errorReason = assessment.error || "Identitas barang tidak valid.";
        }
      }

      if (hasError) {
        error.push({ ...draftRow, _errorReason: errorReason });
      } else {
        valid.push(draftRow);
      }
    });

    return NextResponse.json({ valid, error, sumberTahun, total: rawData.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal memproses file" }, { status: 500 });
  }
}
