# Rencana Implementasi Tahap 4 (Otomatisasi & Sync Data Method)

Tahap sebelumnya (struktur data Cashflow & Nota horizontal) sudah berhasil diperbaiki. Menanggapi catatan Anda mengenai sinkronisasi (*Sync Data Method*), berikut adalah rancangan alur yang akan diimplementasikan agar Aset dan Cashflow benar-benar memiliki relasi sesuai dengan revisi:

## User Review Required

> [!WARNING]
> **Perubahan Skema Database**: Implementasi ini membutuhkan relasi tabel Aset (`Barang`) dan Cashflow (`Pengeluaran`). Saya akan menambahkan *Foreign Key* `pengeluaranId` ke dalam tabel `Barang`. Harap pastikan *schema* di bawah ini sesuai dengan visi alur bisnis Anda.

## Open Questions

> [!IMPORTANT]
> - Apakah kode dari dropdown cashflow ini ingin ditampilkan di tabel Daftar Barang? Atau cukup di dalam Form/Modal Add Item?
> - Apakah saat menghapus data pengeluaran (cashflow), `pengeluaranId` pada barang tersebut cukup dikosongkan (set ke null) tanpa menghapus asetnya?

## Proposed Changes

### Database Schema (Prisma)
#### [MODIFY] [schema.prisma](file:///d:/ProjectTTU/fti-uksw/prisma/schema.prisma)
- Menambahkan relasi One-to-Many dari `Pengeluaran` (Cashflow) ke `Barang` (Aset).
- Tabel `Barang`: Tambah `pengeluaranId String?` dan relasi ke `Pengeluaran`.
- Tabel `Pengeluaran`: Tambah `barang Barang[]`.

---

### Backend API
#### [NEW/MODIFY] [api/pengeluaran/route.ts](file:///d:/ProjectTTU/fti-uksw/app/api/pengeluaran/route.ts)
- Menambahkan logika untuk memberikan daftar `kodePembelian` dari *Cashflow* ke Frontend untuk disajikan di dropdown form Aset.
- Jika ada *update* dari Aset (yang mengisi `pengeluaranId`), API Cashflow akan menyertakan data relasi barang ini saat di-fetch (misalnya via *include* prisma).

#### [MODIFY] [api/barang/route.ts](file:///d:/ProjectTTU/fti-uksw/app/api/barang/route.ts)
- Menerima `pengeluaranId` pada saat Create / Update barang dari *Manual Add Item*.

---

### Frontend Components (Aset)
#### [MODIFY] [BarangFormFields.tsx](file:///d:/ProjectTTU/fti-uksw/components/features/barang/BarangFormFields.tsx)
- **Dropdown Cashflow (Opsional)**: Menampilkan list kode cashflow yang sudah ada (contoh: `SPB-03/290-12-072026-001`).
- Jika dropdown ini diisi, maka data aset yang di-*input* akan tertaut pada ID Bukti Pembayaran tersebut (relasi `pengeluaranId`).

---

### Frontend Components (Cashflow)
#### [MODIFY] [LaporanManager.tsx](file:///d:/ProjectTTU/fti-uksw/components/features/LaporanManager.tsx)
- Menampilkan daftar aset/barang (Recent Pembelian) yang memiliki relasi kode sama di Modal/View Pengeluaran, sehingga saat user mengecek cashflow dengan kode tertentu, akan terlihat rincian barang apa saja yang masuk ke bukti pembayaran tersebut.

## Verification Plan

### Automated Tests
- Menjalankan `bunx prisma generate` dan `bunx prisma db push` untuk memastikan skema berhasil terupdate dan bermigrasi tanpa menghapus/menimpa data yang tidak perlu.
- Pengecekan tipe seluruh proyek via `bunx tsc --noEmit`.

### Manual Verification
- Melakukan "Add Item" secara manual dan memilih kode *Cashflow* dari dropdown.
- Melihat laporan *Cashflow*, dan memastikan aset yang di-*add* tersebut otomatis muncul pada rincian kode bukti pembayaran yang sesuai.
