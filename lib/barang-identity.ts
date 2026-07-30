export type BarangIdentity = {
  namaBarang: string | null;
  label: string | null;
  labelAset: string | null;
  sn: string | null;
  kategori: string | null;
  merek: string | null;
  tanggalDatang: Date | null;
};

export type AssessResult = {
  isValid: boolean;
  normalizedData: BarangIdentity;
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

export function assessBarangIdentity(input: Partial<BarangIdentity>): AssessResult {
  const normalizedData: BarangIdentity = {
    namaBarang: normalizeString(input.namaBarang),
    label: normalizeString(input.label),
    labelAset: normalizeString(input.labelAset),
    sn: normalizeString(input.sn),
    kategori: normalizeString(input.kategori),
    merek: normalizeString(input.merek),
    tanggalDatang: input.tanggalDatang || null,
  };

  const hasNamaBarang = !!normalizedData.namaBarang;
  const hasLabel = !!normalizedData.label;
  const hasLabelAset = !!normalizedData.labelAset;

  const isValid = hasNamaBarang || hasLabel || hasLabelAset;

  return {
    isValid,
    normalizedData,
    error: isValid
      ? undefined
      : "Data barang belum memiliki identitas yang cukup. Isi minimal Nama Barang, Label, atau Label Aset.",
  };
}
