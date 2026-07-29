// constants/barang.ts
// Shared constants for Barang-related components

export const BARANG_FORM_EMPTY = {
  namaBarang: "",
  progdi: "",
  label: "", labelAset: "", sn: "", merek: "", model: "", tipe: "", vendor: "", keterangan: "",
  kondisi: "BAIK", jumlah: 1, tanggalDatang: "", tanggalPindah: "", harga: "", kategori: "", ruangan: "",
  sumberTahun: "", status: "TERSEDIA", pembelianKe: "" as string | number,
};

export type BarangFormData = typeof BARANG_FORM_EMPTY;

/** Dropdown options for Kondisi field */
export const KONDISI_OPTIONS = [
  { value: "BAIK", label: "Baik" },
  { value: "RUSAK_RINGAN", label: "Rusak Ringan" },
  { value: "RUSAK_BERAT", label: "Rusak Berat" },
] as const;

/** CSS class mappings for badges */
export const KONDISI_BADGE: Record<string, string> = {
  BAIK: "badge-ok",
  RUSAK_RINGAN: "badge-warn",
  RUSAK_BERAT: "badge-danger",
};

export const STATUS_BADGE: Record<string, string> = {
  TERSEDIA: "badge-ok",
  DIPINJAM: "badge-warn",
  MAINTENANCE: "badge-muted",
};

/** Daftar Program Studi FTI UKSW */
export const PROGDI_OPTIONS = [
  // D3
  { value: "Teknik Informatika (D3)", label: "Teknik Informatika (D3)" },
  // S1
  { value: "Teknik Informatika (S1)", label: "Teknik Informatika (S1)" },
  { value: "Sistem Informasi (S1)", label: "Sistem Informasi (S1)" },
  { value: "Desain Komunikasi Visual (S1)", label: "Desain Komunikasi Visual (S1)" },
  { value: "Pendidikan Teknik Informatika dan Komputer (S1)", label: "Pendidikan Teknik Informatika dan Komputer (S1)" },
  { value: "Hubungan Masyarakat (S1)", label: "Hubungan Masyarakat (S1)" },
  { value: "Perpustakaan dan Sains Informasi (S1)", label: "Perpustakaan dan Sains Informasi (S1)" },
  { value: "Bisnis Digital (S1)", label: "Bisnis Digital (S1)" },
  // S2
  { value: "Magister Sistem Informasi (S2)", label: "Magister Sistem Informasi (S2)" },
  // S3
  { value: "Doktoral Ilmu Komputer (S3)", label: "Doktoral Ilmu Komputer (S3)" },
];
