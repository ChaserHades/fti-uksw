# Perbaikan 06: validasi masukan API peminjaman

Pemeriksaan cloud: 4 November 2026. Crosscheck lokal pengguna untuk tahap ini belum dikonfirmasi.

## Lingkup dan perilaku

Tahap ini khusus `GET` dan `POST /api/peminjaman`. Sebelumnya, JSON rusak atau nilai seperti angka pada nama peminjam dapat menyebabkan error server. Tanggal yang tidak valid baru ditangani ketika transaksi mengakses database; JavaScript juga dapat menggeser tanggal seperti 30 Februari ke bulan berikutnya. Parameter `limit` memakai `parseInt`, sehingga `10junk` diterima sebagai 10.

Sekarang API mengembalikan HTTP **400** dengan pesan JSON sebelum query/transaksi peminjaman bila masukan tidak valid. Pemeriksaan sesi dan role tetap dilakukan lebih dahulu; pemeriksaan sesi masih dapat membaca database akun. Kesalahan database yang tidak berkaitan dengan input tetap diteruskan sebagai kegagalan server, bukan disamarkan menjadi 400.

| Masukan | Aturan |
| --- | --- |
| Body POST | JSON berupa objek; JSON rusak, null, array, dan nilai primitif ditolak. |
| `barangId` | Teks yang tidak kosong. Nilai ID tidak dipangkas atau diganti. |
| `namaPeminjam`, `ruanganTujuan` | Teks yang tidak kosong setelah spasi awal/akhir dipangkas, seperti perilaku formulir sebelumnya. |
| `deadlineKembali` | Tanggal kalender valid `YYYY-MM-DD` atau timestamp ISO 8601 dengan zona waktu. Tahun 0000, tanggal yang tidak ada, format ambigu, dan timestamp tanpa zona waktu ditolak. Tahun 0001–9999 didukung untuk tanggal biasa. |
| `catatan` | Teks, null, atau tidak disertakan. Teks kosong dan spasi dalam catatan tetap dipertahankan. |
| `limit` GET | Angka bulat 1–500. Tidak disertakan atau kosong memakai default 50. Batas 500 mempertahankan kebutuhan pemindai dan dashboard saat ini. |
| `status` GET | AKTIF, SELESAI, TERLAMBAT, atau kosong/tidak disertakan untuk semua status. Nilai lain sekarang ditolak. |

Tanggal lampau tetap diterima. Tidak ada batas tanggal minimal baru. Konversi tanggal valid ke database, batas keterlambatan 18.00 WIB, autentikasi, role, proyeksi profil pengguna, dan transaksi bersyarat nomor 4 tetap mengikuti perilaku sebelumnya. Field milik server seperti `userId`, `status`, dan `terlambat` tidak diambil dari body pengguna. Parameter pencarian, cursor, dan userId GET tetap memakai mekanisme yang sudah ada.

Pemanggil API di luar antarmuka harus mengikuti format tanggal/status dan batas limit tersebut. Request yang sebelumnya lolos karena parsing longgar dapat sekarang mendapat 400. Tidak ada perubahan formulir, navigasi, schema, migrasi, dependensi, atau dokumen TTU. Validasi endpoint aset, pengeluaran, dan endpoint lainnya belum termasuk tahap ini.

## Berkas yang berubah

- `app/api/peminjaman/route.ts`: validasi query dan body sebelum mengakses data peminjaman; catch hanya untuk pembacaan JSON.
- `lib/peminjaman-input.ts`: schema validasi memakai Zod yang sudah menjadi dependensi proyek.
- `tests/peminjaman-input.test.mjs`: tes handler untuk input salah, input normal, pagination, izin, dan kegagalan database.
- `tests/peminjaman-concurrency.integration.mjs`: tambahan satu skenario HTTP nyata untuk penolakan input tanpa perubahan data.
- Dokumen panduan ini.

## Bukti pengujian cloud

| Pemeriksaan | Hasil |
| --- | --- |
| `node --test tests/*.test.mjs` | **95 pass, 0 fail, 0 skipped**: 83 tes sebelumnya dan 12 tes baru. Beberapa tes memeriksa beberapa variasi input. Prisma pada rangkaian ini berupa fixture. |
| HTTP, Prisma, PostgreSQL nyata | **9 skenario lulus**, runner menghitung **10 pass** termasuk tes induk. Input invalid menghasilkan 400; barang tetap TERSEDIA, tidak ada pinjaman maupun log baru. Request valid setelahnya berhasil. |
| Regresi transaksi | Tiga putaran permintaan bersamaan menghasilkan satu 201 dan satu 409. Kegagalan INSERT pinjaman/log tetap rollback. Pengembalian dan pinjam ulang tetap berjalan. |
| Regresi keterlambatan | Daftar, filter, statistik, ekspor, serta pengembalian tetap konsisten. |
| Build | `npm run build` berhasil. Konfigurasi lama melewati pemeriksaan tipe penuh saat build. |
| TypeScript terarah | Tidak ada diagnostik pada route dan helper validasi beserta dependensinya. Bukan klaim seluruh proyek bebas error tipe. |
| Lint terarah | Tidak ada temuan baru dibanding HEAD sebelum perubahan. Satu temuan lama pada route tetap ada. |

Tes integrasi memakai database baru yang terpisah, lalu menghapus database uji dan menghentikan server uji. Data aplikasi pengguna tidak menjadi sasaran penulisan tes.

## Pemasangan dan crosscheck manual

1. Di `D:\ProjectTTU\fti-uksw`, hentikan server dengan `Ctrl+C`. Jalankan:

   ```powershell
   git status --short
   git pull --ff-only origin main
   node --test tests/*.test.mjs
   npm run dev
   ```

   Jika pull terhalang perubahan lokal, simpan pekerjaan tersebut dahulu; jangan gunakan reset hard. Hasil tes revisi ini adalah 95 pass. Tidak perlu migrate, reset, seed, atau instalasi paket baru. Untuk menjalankan mode produksi, gunakan `npm run build` lalu `npm run start`.

2. Login Admin, buka DevTools → Network, aktifkan Disable cache. Buka Dashboard, Peminjaman, lalu Riwayat. Coba filter AKTIF/SELESAI/TERLAMBAT dan Semua Status. Request peminjaman normal harus 200. Coba Muat Lebih Banyak bila tersedia.

3. Dalam sesi login yang sama, buka URL berikut satu per satu. Gunakan filter **All/Doc** pada Network jika membuka URL langsung:

   | URL | Hasil yang diharapkan |
   | --- | --- |
   | `/api/peminjaman?limit=0` | 400, pesan limit 1–500 |
   | `/api/peminjaman?limit=10junk` | 400, pesan limit 1–500 |
   | `/api/peminjaman?limit=501` | 400, pesan limit 1–500 |
   | `/api/peminjaman?status=SALAH` | 400, pesan pilihan status |
   | `/api/peminjaman?status=AKTIF&limit=500` | 200, daftar peminjaman |

4. Kembali ke halaman aplikasi. Di Console, jalankan kode berikut untuk menguji body invalid. Semua contoh sengaja salah; ID contoh tidak menunjuk barang operasional:

   ```javascript
   const contoh06 = {
     barangId: "UJI-06-ID-TIDAK-ADA",
     namaPeminjam: "UJI-06",
     ruanganTujuan: "Lab Uji",
     deadlineKembali: "2026-11-05"
   };
   for (const [kasus, body] of [
     ["JSON rusak", "{"],
     ["Body null", "null"],
     ["Nama angka", JSON.stringify({ ...contoh06, namaPeminjam: 123 })],
     ["Tanggal tidak ada", JSON.stringify({ ...contoh06, deadlineKembali: "2026-02-30" })],
     ["Catatan objek", JSON.stringify({ ...contoh06, catatan: {} })]
   ]) {
     const r = await fetch("/api/peminjaman", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body
     });
     console.log(kasus, r.status, await r.json());
   }
   ```

   Semuanya harus **400**, dengan pesan sesuai isian yang salah. Pesan `Barang tidak ditemukan` bukan hasil yang diharapkan untuk contoh ini: validasi input harus berjalan sebelum pencarian barang. Tidak boleh ada pinjaman atau aktivitas CREATE baru dari percobaan tersebut. Warna merah untuk request 400 yang sengaja diuji adalah hasil penolakan yang diharapkan.

5. Gunakan satu barang uji TERSEDIA. Melalui formulir biasa, buat peminjaman bernama `UJI-06-NORMAL`, ruangan valid, deadline besok, dan catatan kosong. Harus berhasil **201** dan muncul dalam daftar aktif. Kembalikan melalui tombol aplikasi: harus **200**, riwayat SELESAI, dan barang kembali TERSEDIA. Percobaan ini benar-benar mencatat transaksi; selesaikan pengembalian setelah pengecekan. Ulangi sebagai Teknisi bila perlu memastikan kedua role.

Catat langkah, status HTTP, dan pesan jika hasil berbeda. Crosscheck nomor 6 tidak menggantikan uji konkurensi nomor 4 atau batas waktu nomor 5. Untuk menjalankan tes integrasi opsional setelah build, ikuti pengaturan database lokal terpisah pada [panduan nomor 4](Verifikasi_Perbaikan_04.md), lalu jalankan `node --test tests/peminjaman-concurrency.integration.mjs`.
