// types/index.ts

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "PETUGAS" | "UNIVERSITAS";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
}

export interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  deskripsi?: string | null;
  kondisi: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  status: "TERSEDIA" | "DIPINJAM" | "MAINTENANCE";
  jumlah: number;
  tahunBeli?: number | null;
  harga?: number | null;
  qrCode?: string | null;
  kategoriId: string;
  ruanganId?: string | null;
  createdAt: string;
  updatedAt: string;
  kategori: KategoriBarang;
  ruangan?: Ruangan | null;
}

export interface KategoriBarang {
  id: string;
  nama: string;
  deskripsi?: string | null;
  createdAt: string;
}

export interface Ruangan {
  id: string;
  kode: string;
  nama: string;
  gedung?: string | null;
  lantai?: string | null;
  kapasitas?: number | null;
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: "ADMIN" | "PETUGAS" | "UNIVERSITAS";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface Transaksi {
  id: string;
  barangId: string;
  userId: string;
  tanggalPinjam: string;
  tanggalKembali?: string | null;
  deadlineKembali: string;
  status: "AKTIF" | "SELESAI" | "TERLAMBAT";
  catatan?: string | null;
  barang: Barang;
  user: User;
}

export interface DashboardStats {
  totalBarang: number;
  totalUsers: number;
  pendingVerifikasi: number;
  dipinjam: number;
  terlambat: number;
}
