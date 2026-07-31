// lib/import-barang-identity.ts

export type ImportBarangIdentity = {
  namaBarang: string | null;
  label: string | null;
  labelAset: string | null;
  sn: string | null;
  kategori: string | null;
  merek: string | null;
  tanggalDatang: Date | null;
};

export type ImportAssessResult = {
  isValid: boolean;
  normalizedData: ImportBarangIdentity;
  error?: string;
};

export function isFalsyValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "--" ||
      trimmed === "n/a" ||
      trimmed === "null" ||
      trimmed === "undefined"
    ) {
      return true;
    }
  }
  return false;
}

export function normalizeString(val: any): string | null {
  if (isFalsyValue(val)) return null;
  return String(val).trim();
}

/**
 * Validates ONLY rows coming from the import process.
 *
 * VALID rules:
 * - Nama Barang only
 * - Label Aset only
 * - Label + Kategori
 * - Label + Merek
 * - Label + Kategori + Merek
 *
 * INVALID rules:
 * - Label only
 * - Label + Tanggal Datang only
 * - Kategori only
 * - Merek only
 * - Tanggal Datang only
 * - Kategori + Merek + Tanggal Datang (without Nama Barang / Label / Label Aset)
 * - SN only
 * - SN + Kategori + Merek + Tanggal
 */
export function assessImportBarangIdentity(input: Partial<ImportBarangIdentity>): ImportAssessResult {
  const normalizedData: ImportBarangIdentity = {
    namaBarang: normalizeString(input.namaBarang),
    label: normalizeString(input.label),
    labelAset: normalizeString(input.labelAset),
    sn: normalizeString(input.sn),
    kategori: normalizeString(input.kategori),
    merek: normalizeString(input.merek),
    tanggalDatang: input.tanggalDatang || null,
  };

  const hasNama = !!normalizedData.namaBarang;
  const hasLabel = !!normalizedData.label;
  const hasLabelAset = !!normalizedData.labelAset;
  const hasKategori = !!normalizedData.kategori;
  const hasMerek = !!normalizedData.merek;

  let isValid = false;

  // Nama Barang only -> VALID
  if (hasNama) {
    isValid = true;
  }
  // Label Aset only -> VALID
  else if (hasLabelAset) {
    isValid = true;
  }
  // Label + Kategori -> VALID
  else if (hasLabel && hasKategori) {
    isValid = true;
  }
  // Label + Merek -> VALID
  else if (hasLabel && hasMerek) {
    isValid = true;
  }

  // Segala kombinasi lain tanpa Nama / Label Aset / (Label + Kat/Merek) dianggap INVALID.

  return {
    isValid,
    normalizedData,
    error: isValid
      ? undefined
      : "Data import tidak memiliki identitas fisik yang valid. Harus memiliki minimal Nama Barang, Label Aset, atau kombinasi (Label + Kategori/Merek).",
  };
}
