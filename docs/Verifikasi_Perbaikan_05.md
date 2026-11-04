# Perbaikan 05: perhitungan keterlambatan pada batas 18.00 WIB

Tanggal pemeriksaan cloud: 4 November 2026. Crosscheck lokal pengguna untuk tahap ini belum dikonfirmasi.

## Masalah dan aturan yang dipertahankan

Sebelumnya, statistik dashboard membandingkan deadline yang tersimpan sebagai tanggal dengan waktu saat permintaan diproses. Akibatnya, pinjaman dapat dihitung terlambat sejak awal tanggal deadline, sebelum batas pengembalian. Helper pada browser memakai pukul 18.00 dalam zona waktu perangkat. Sementara itu, API pengembalian sudah memakai pukul 18.00 WIB. Filter riwayat dan ekspor hanya membaca flag database sehingga pinjaman aktif yang sudah melewati batas dapat belum dikenali sebagai terlambat.

Aturan bersama sekarang mengikuti batas pada API pengembalian yang sudah ada:

- Tanggal deadline tetap berasal dari isian tanggal pada formulir, disimpan sebagai tanggal UTC seperti sebelumnya.
- Batas pengembalian adalah pukul **18.00 WIB (11.00 UTC)** pada tanggal tersebut.
- Tepat pukul 18.00.00.000 WIB belum terlambat; setelahnya terlambat.
- Penanda **Segera** berlaku ketika waktu menuju batas masih lebih dari nol dan paling lama 24 jam.
- Pinjaman aktif dihitung terlambat ketika melewati batas. Flag keterlambatan yang sudah tersimpan tetap dihormati.
- Transaksi SELESAI yang dikembalikan tepat waktu tidak berubah menjadi terlambat hanya karena waktu berjalan.
- Saat pengembalian, flag keterlambatan disimpan seperti sebelumnya. Membuka daftar, filter, statistik, dan ekspor tidak menulis flag ke database.

Riwayat dan dashboard memiliki cakupan berbeda: angka terlambat pada dashboard hanya untuk transaksi AKTIF, sedangkan filter TERLAMBAT pada Riwayat juga mencakup transaksi SELESAI yang memang terlambat. Karena itu, kedua angka tidak harus sama setelah barang dikembalikan.

## Berkas yang disentuh

| Berkas | Perubahan |
| --- | --- |
| `helpers/peminjaman.ts` | Helper batas waktu WIB, penanda segera, keterlambatan transaksi, dan kondisi pencarian database. Tidak bergantung pada zona waktu server/browser. |
| `helpers/format.ts` | Mengekspor ulang helper waktu agar pemanggilan lama tetap tersedia. Fungsi format tanggal, mata uang, QR, dan terbilang tidak berubah. |
| `app/api/dashboard/stats/route.ts` | Menghitung keterlambatan transaksi aktif dengan batas yang sama. |
| `app/api/peminjaman/route.ts` | GET menghitung `terlambat` untuk respons; filter TERLAMBAT mencakup aktif yang melewati batas dan flag historis. Filter digabung dengan pencarian melalui AND agar tidak tertimpa OR pencarian. POST nomor 4 tidak berubah. |
| `app/api/peminjaman/[id]/kembali/route.ts` | Menggunakan helper bersama saat menyimpan flag keterlambatan. Urutan pengembalian barang dan log tetap. |
| `app/api/peminjaman/export/route.ts` | Kolom KETERANGAN CSV/Excel memakai aturan yang sama dengan daftar. Format dan susunan kolom tetap. |
| `app/admin/dashboard/page.tsx`, `app/petugas/dashboard/page.tsx` | Menggunakan helper transaksi untuk indikator keterlambatan. |
| `components/features/PinjamManager.tsx` | Menggunakan helper yang sama untuk hitungan, badge, dan peringatan saat pengembalian. |
| `tests/peminjaman-deadline.test.mjs` | Tes batas waktu, zona waktu, filter, statistik, ekspor, dan pengembalian dengan jam yang dikendalikan pada tes. |
| `tests/peminjaman-concurrency.integration.mjs` | Menambah skenario keterlambatan melalui HTTP/Prisma/PostgreSQL nyata, serta mempertahankan tes nomor 4. |

Tidak ada perubahan schema, migrasi, dependensi, formulir, navigasi, pembagian role, atau perbaikan ulang data historis. Dokumen skripsi yang sudah diedit pengguna tidak ditimpa pada tahap ini. Angka pada daftar yang menggunakan pagination tetap mengikuti data yang dimuat; perubahan ini menyamakan aturan waktu, bukan merombak pagination atau menambah penyegaran otomatis.

## Hasil pengujian

| Pemeriksaan | Hasil dan batasnya |
| --- | --- |
| Reproduksi sebelum perubahan | Pada kode lama, helper di zona UTC menyatakan belum terlambat pada 18.00 WIB + 1 ms. Query statistik lama sudah menghitung deadline hari ini terlambat pada 17.00 WIB. |
| Tes regresi | `node --test tests/*.test.mjs`: **83 pass, 0 fail, 0 skipped**. Sebanyak 67 tes sebelumnya dan 16 tes baru. Database pada rangkaian ini berupa fixture. |
| Batas waktu | Diuji sebelum, tepat pada, dan sesudah 18.00 WIB, serta batas 24 jam untuk penanda Segera. |
| Zona waktu | UTC, Asia/Jakarta, Asia/Makassar, dan America/Los_Angeles menghasilkan klasifikasi yang sama pada waktu absolut yang sama. |
| Pergantian tanggal | Kondisi filter database cocok dengan perhitungan helper saat pergantian hari, tahun, dan tanggal kabisat; termasuk deadline historis yang memiliki komponen jam. |
| Riwayat | Pengembalian tepat waktu tetap tidak terlambat setelah deadline lewat; flag terlambat tersimpan tetap dipertahankan. |
| HTTP dan PostgreSQL nyata | Delapan skenario lulus; runner melaporkan **9 pass** karena menghitung satu tes induk. List/filter/pagination/count, statistik, CSV/Excel, serta pengembalian diuji dengan database terpisah. Pembacaan dan ekspor terbukti tidak menulis flag. |
| Regresi nomor 4 | Tiga putaran permintaan bersamaan tetap menghasilkan satu 201 dan satu 409; kegagalan pinjaman/log tetap rollback; pengembalian kemudian pinjam ulang tetap berhasil. |
| Build | `npm run build` berhasil. Pengaturan lama `ignoreBuildErrors: true` masih berlaku, sehingga build bukan bukti seluruh proyek bebas error tipe. |
| TypeScript terarah | Tidak ada diagnostik pada helper dan empat route API yang diubah beserta dependensinya. |
| Lint | Tidak ada temuan baru pada berkas yang diubah/ditambahkan setelah dibandingkan dengan kode sebelum perubahan. Temuan lint lama tetap ada; tidak dilakukan auto-fix di luar lingkup ini. |

Jam terkendali hanya dipakai dalam fixture tes; tidak ada pengaturan jam palsu atau jalan pintas autentikasi pada aplikasi. Pengujian integrasi membuat database baru, menyiapkan data fixture, menyalakan Next.js hasil build pada port terpisah, kemudian menghapus database uji dan menghentikan servernya. Database pengguna tidak digunakan untuk pengujian tersebut.

## Pemasangan lokal

Di `D:\ProjectTTU\fti-uksw`, hentikan server dengan `Ctrl+C`, lalu jalankan:

```powershell
git status --short
git pull --ff-only origin main
node --test tests/*.test.mjs
npm run dev
```

Hasil tes pada revisi ini seharusnya 83 pass, 0 fail. Jika perubahan lokal menghalangi pull, simpan pekerjaan tersebut dan periksa konflik; jangan gunakan reset hard. Tidak diperlukan migrate, reset, seed, atau instalasi dependensi baru. Untuk mode produksi lokal gunakan `npm run build` lalu `npm run start`.

## Crosscheck manual

Gunakan barang uji yang tersedia dan nama peminjam unik, misalnya `UJI-05-KEMARIN` dan `UJI-05-BESOK`. Transaksi akan benar-benar dicatat dan perlu diselesaikan melalui pengembalian. Jangan mengubah jam komputer atau data transaksi operasional untuk pengujian ini.

1. Login sebagai Admin. Buka DevTools → Network → Fetch/XHR dan aktifkan Disable cache. Siapkan sesi Teknisi terpisah bila ingin mencocokkan kedua dashboard.
2. Buat peminjaman barang uji A dengan deadline **kemarin**. Data ini khusus skenario uji keterlambatan. Setelah disimpan, muat ulang halaman Peminjaman: pinjaman harus ditandai **Terlambat**. Buka Dashboard dan cocokkan perubahan hitungan transaksi aktif terlambat terhadap kondisi sebelum percobaan.
3. Buka Riwayat → Peminjaman, pilih filter **Terlambat**. Transaksi A harus muncul meskipun barang belum dikembalikan. Pada respons GET `/api/peminjaman`, transaksi itu harus memiliki `status: "AKTIF"` dan `terlambat: true`.
4. Ekspor Riwayat melalui CSV atau Excel. Cari nama peminjam uji A: kolom STATUS tetap AKTIF, sedangkan KETERANGAN harus Terlambat.
5. Buat peminjaman barang uji B dengan deadline **besok**. Transaksi B tidak boleh ditandai terlambat dan tidak muncul pada filter Terlambat. Penanda Segera boleh muncul jika sisa waktu menuju 18.00 WIB besok sudah paling lama 24 jam.
6. Kembalikan A dan B melalui tombol aplikasi. Pada riwayat, A berstatus transaksi SELESAI tetapi tetap memiliki `terlambat: true` dan dapat tampil dengan badge Terlambat. B berstatus SELESAI dengan `terlambat: false`. Sesudah A dikembalikan, ia tidak lagi dihitung sebagai transaksi aktif terlambat pada dashboard, tetapi tetap ada dalam filter Terlambat di Riwayat.
7. Untuk deadline **hari ini**, sebelum atau tepat 18.00 WIB transaksi belum terlambat; sesudah 18.00 WIB transaksi aktif menjadi terlambat. Muat ulang halaman agar data dan tampilan diperbarui. Tidak perlu menunggu jam tersebut untuk menjalankan tes otomatis: batas waktunya sudah diuji memakai jam terkendali.
8. Bila memeriksa di browser dengan zona waktu berbeda, bandingkan indikator keterlambatan pada waktu absolut yang sama. Pengubahan zona waktu tidak boleh menggeser batas 18.00 WIB. Tampilan tanggal umum tetap memakai fungsi format yang sudah ada.

Catat nama peminjam uji, deadline, waktu pemeriksaan dalam WIB, status transaksi, penanda terlambat, dan tampilan/hasil ekspor yang berbeda bila ada. Lakukan pengembalian untuk seluruh transaksi uji yang masih aktif setelah pemeriksaan.

## Tes integrasi opsional

Prasyarat dan isolasi database mengikuti [panduan nomor 4](Verifikasi_Perbaikan_04.md). Setelah build, set `TEST_DATABASE_ADMIN_URL` secara lokal ke PostgreSQL localhost dengan izin membuat database, kemudian jalankan:

```powershell
node --test tests/peminjaman-concurrency.integration.mjs
```

Tes tidak memakai database aplikasi sebagai sasaran penulisan. Gunakan hasil terbaru dari rangkaian ini; jumlah 8 pass pada catatan nomor 4 adalah hasil historis sebelum skenario keterlambatan ditambahkan.
