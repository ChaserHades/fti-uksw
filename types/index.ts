// types/index.ts

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEKNISI" | "UNIVERSITAS";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
}

export interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  serialNumber?: string | null;
  merek?: string | null;
  tipe?: string | null;
  vendor?: string | null;
  deskripsi?: string | null;
  kondisi: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  status: "TERSEDIA" | "DIPINJAM" | "MAINTENANCE";
  jumlah: number;
  tanggalBeli?: string | null;
  harga?: number | null;
  hasSticker: boolean;
  qrCode?: string | null;
  foto?: string | null;
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
  lantai?: string | null;
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: "ADMIN" | "TEKNISI" | "UNIVERSITAS";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Transaksi {
  id: string;
  barangId: string;
  /** Petugas/Teknisi yang melakukan scan/pencatatan */
  userId: string;
  /** Peminjam aktual (mahasiswa/dosen/staf) */
  namaPeminjam: string;
  /** Ruangan tujuan penggunaan */
  ruanganPinjam: string;
  tanggalPinjam: string;
  tanggalKembali?: string | null;
  deadlineKembali: string;
  status: "AKTIF" | "SELESAI";
  /** Persisten: true jika pernah melewati deadline */
  terlambat: boolean;
  catatan?: string | null;
  barang: Barang;
  user: User;
}

export interface DashboardStats {
  totalBarang: number;
  totalRuangan: number;
  totalUsers: number;
  pendingVerifikasi: number;
  dipinjam: number;
  terlambat: number;
}

export interface Pengeluaran {
  id: string;
  judul: string;
  deskripsi?: string | null;
  nominal: number;
  tanggal: string;
  jenis: "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";
  notaUrl?: string | null;
  userId: string;
  createdAt: string;
  user: User;
}