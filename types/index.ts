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
  namaBarang?: string | null;
  progdi?: string | null;
  label: string | null;
  labelAset: string | null;
  sn?: string | null;
  merek?: string | null;
  model?: string | null;
  tipe?: string | null;
  vendor?: string | null;
  keterangan?: string | null;
  kondisi: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  status: "TERSEDIA" | "DIPINJAM" | "MAINTENANCE";
  jumlah: number;
  tanggalDatang?: string | null;
  tanggalPindah?: string | null;
  harga?: number | null;
  sumberTahun?: string | null;
  pembelianKe?: number | null;
  hasSticker: boolean;
  qrCode?: string | null;
  foto?: string | null;
  kategoriId: string;
  ruanganId?: string | null;
  pengeluaranId?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  kategori: Kategori;
  ruangan?: Ruangan | null;
  pengeluaran?: Pengeluaran | null;
}

export interface Kategori {
  id: string;
  nama: string;
  keterangan?: string | null;
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

export interface Peminjaman {
  id: string;
  barangId: string;
  /** Petugas/Teknisi yang melakukan scan/pencatatan */
  userId: string;
  /** Peminjam aktual (mahasiswa/dosen/staf) */
  namaPeminjam: string;
  /** Ruangan/Ruangan tujuan penggunaan */
  ruanganTujuan: string;
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
  statusStat?: {
    tersedia: number;
    dipinjam: number;
    maintenance: number;
    total: number;
  };
  kondisiStat?: {
    baik: number;
    rusakRingan: number;
    rusakBerat: number;
  };
  katStat?: { nama: string; total: number }[];
  pengeluaranStat?: {
    totalNominal: number;
    count: number;
  };
}

export interface Pengeluaran {
  id: string;
  judul: string;
  namaBarang?: string | null;
  progdi?: string | null;
  keterangan?: string | null;
  nominal: number;
  tanggal: string;
  jenis: "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";
  jenisBukti?: string | null;
  nomorBukti?: string | null;
  notaUrls: string[];
  kodePembelian?: string | null;
  pembelianKe?: number | null;
  userId: string;
  createdAt: string;
  user: User;
}