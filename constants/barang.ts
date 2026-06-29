// constants/barang.ts
// Shared constants for Barang-related components

/** Empty form state for creating/editing a Barang */
export const BARANG_FORM_EMPTY = {
  label: "", labelAset: "", nama: "", sn: "", merek: "", model: "", tipe: "", vendor: "", keterangan: "",
  kondisi: "BAIK", jumlah: 1, tanggalDatang: "", tanggalPindah: "", harga: "", jenisBarangId: "", letakId: "",
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
