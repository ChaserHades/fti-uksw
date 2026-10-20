# Perbaikan 04: mencegah peminjaman barang yang sama secara bersamaan

Tanggal pemeriksaan: 20 Oktober 2026. Crosscheck pada browser lokal pengguna masih menunggu konfirmasi.

## Perubahan

Sebelumnya, `POST /api/peminjaman` membaca status barang sebelum membuka transaksi. Dua permintaan dapat sama-sama membaca `TERSEDIA`, lalu masing-masing membuat pinjaman. Masalah tersebut berhasil direproduksi melalui dua permintaan HTTP yang bertumpang tindih di PostgreSQL: keduanya mendapat 201.

Sekarang transaksi dimulai dengan pembaruan bersyarat pada satu ID barang: status harus `TERSEDIA` dan `deletedAt` harus null. Pembaruan mengubah status menjadi `DIPINJAM` dan menahan kunci baris sampai transaksi selesai. Setelah itu sistem membuat pinjaman serta log aktivitas di transaksi yang sama. Permintaan kedua menunggu, lalu tidak lagi memenuhi syarat apabila permintaan pertama berhasil. Kegagalan penyimpanan pinjaman atau log membatalkan seluruh transaksi, termasuk perubahan status barang.

| Berkas | Perubahan |
| --- | --- |
| `app/api/peminjaman/route.ts` | Validasi ID barang; pembaruan status bersyarat, pembuatan pinjaman, dan log dalam satu transaksi; respons konflik 409. |
| `tests/api-user-privacy.test.mjs` | Menyesuaikan fixture transaksi dan menambah tujuh kasus ID barang tidak valid. Pemeriksaan profil tanpa hash password tetap dijalankan. |
| `tests/peminjaman-concurrency.integration.mjs` | Pengujian HTTP pada Next.js hasil build dengan Prisma dan PostgreSQL nyata, termasuk konkurensi dan rollback. |
| Dokumen ini | Bukti pemeriksaan dan langkah crosscheck manual. |

Formulir, urutan scan/input barang, nama isian, pembagian role, dan proses pengembalian tetap memakai implementasi yang ada. Komponen peminjaman sudah menampilkan pesan error dari API melalui toast, sehingga tidak perlu perubahan frontend. Respons berhasil tetap berbentuk objek pinjaman dengan status HTTP 201; relasi `barang` pada respons sekarang sudah memuat status `DIPINJAM` yang tersimpan. Route GET, schema, migrasi, dependensi, serta data lama tidak diubah.

| Kondisi | Respons |
| --- | --- |
| Barang tersedia, transaksi lengkap berhasil | 201; satu pinjaman AKTIF, barang DIPINJAM, satu log CREATE PEMINJAMAN. |
| Barang sudah dipinjam atau tidak tersedia, termasuk MAINTENANCE | 409; `Barang sudah dipinjam atau tidak lagi tersedia. Muat ulang data sebelum mencoba lagi.` |
| Barang tidak ditemukan atau sudah dihapus | 400; pesan lama tetap digunakan. |
| ID barang kosong atau bukan string | 400; `Barang wajib dipilih`, sebelum akses database. |
| Penyimpanan pinjaman/log gagal | Permintaan gagal; seluruh perubahan dalam transaksi dibatalkan. |

Validasi ID dibutuhkan agar filter pembaruan selalu mengarah ke satu barang. Cakupan perbaikan ini adalah perebutan barang melalui endpoint pembuatan pinjaman; data pinjaman ganda yang mungkin sudah ada sebelumnya tidak dibersihkan otomatis.

## Hasil pemeriksaan cloud

| Pemeriksaan | Hasil |
| --- | --- |
| Regresi sebelum perbaikan | Build lama menghasilkan dua respons 201 pada dua permintaan bertumpang tindih untuk barang yang sama. Tes baru gagal pada kondisi tersebut. |
| `node --test tests/*.test.mjs` | 67 lulus, 0 gagal: 60 pemeriksaan sebelumnya dan tujuh kasus ID barang tidak valid. Database pada rangkaian ini berupa fixture. |
| HTTP dan PostgreSQL nyata | Tujuh skenario lulus; runner melaporkan 8 pass karena menghitung satu tes induk. Tidak ada skenario dilewati. |
| Dua permintaan barang yang sama | Tiga putaran, masing-masing satu Admin dan satu Teknisi: satu 201, satu 409, satu pinjaman aktif, satu log. Pengiriman ulang sebelum pengembalian tetap 409. |
| Dua barang berbeda | Kedua permintaan berhasil 201. |
| Barang hilang, terhapus, atau MAINTENANCE | Ditolak sesuai status yang diharapkan; tidak membuat pinjaman/log baru. |
| Kegagalan INSERT pinjaman dan INSERT log | Disimulasikan dengan trigger hanya pada database uji. Status kembali TERSEDIA, tidak ada pinjaman/log sisa; percobaan berikutnya berhasil setelah gangguan dilepas. |
| Pengembalian normal lalu pinjam ulang | Pengembalian 200, transaksi pertama SELESAI, barang TERSEDIA; pinjaman berikutnya 201 dengan tepat satu transaksi aktif. |
| Hak akses dan privasi | Anonim 401, Universitas 403; profil pada respons berhasil tidak memuat password atau sessionVersion. |
| Build | `npm run build` berhasil. Pengaturan lama `ignoreBuildErrors: true` masih berlaku. |
| TypeScript dan lint terarah | Tidak ada diagnostik TypeScript pada route peminjaman beserta dependensinya; tidak ada temuan lint baru pada route dan kedua berkas tes yang diubah/ditambahkan. |

Pengujian konkurensi menahan kunci baris barang dari koneksi terpisah, menunggu hingga kedua permintaan HTTP benar-benar menunggu kunci di PostgreSQL, lalu melepasnya. Jadi hasil tidak hanya mengandalkan dua pemanggilan fetch yang kebetulan berurutan. Database pengujian baru dibuat khusus, migrasi diterapkan pada database kosong itu, dan database tersebut dihapus setelah pengujian selesai. Database aplikasi pengguna tidak menjadi sasaran pengujian.

## Mengambil pembaruan di komputer lokal

Di PowerShell, dari `D:\ProjectTTU\fti-uksw`:

1. Hentikan server dengan `Ctrl+C`, lalu jalankan:

   ```powershell
   git status --short
   git pull --ff-only origin main
   git log -1 --oneline
   ```

   Jika perubahan lokal menghalangi pull, simpan dahulu pekerjaan tersebut dan periksa konflik yang dilaporkan. Jangan menimpa revisi laporan lokal dengan `reset --hard` atau langsung menerapkan stash lama tanpa pemeriksaan.

2. Jalankan pemeriksaan dan server:

   ```powershell
   node --test tests/*.test.mjs
   npm run dev
   ```

   Hasil yang diharapkan pada revisi ini: 67 pass, 0 fail. Tidak ada migrasi, seed ulang, atau instalasi dependensi baru pada tahap 4. Untuk mode produksi lokal, gunakan `npm run build` kemudian `npm run start`.

## Crosscheck manual melalui formulir

Gunakan satu barang uji berstatus TERSEDIA yang tidak sedang dipinjam. Percobaan ini memang membuat satu transaksi peminjaman; selesaikan dengan pengembalian melalui aplikasi.

1. Buka dua sesi: A login Admin pada browser biasa; B login Teknisi pada Incognito atau browser lain.
2. Di A buka `/admin/manajemen?tab=pinjam`. Di B buka `/petugas/manajemen?tab=pinjam`.
3. Pada kedua sesi, buka DevTools → Network → Fetch/XHR, aktifkan **Disable cache**.
4. Di kedua sesi, klik **Scan Peminjaman**, lalu pilih barang uji yang sama melalui QR atau input kode manual. Pastikan **kedua Form Peminjaman sudah terbuka sebelum salah satu disimpan**.
5. Isi peminjam berbeda agar hasil mudah dibedakan, misalnya `Uji A` dan `Uji B`. Isi ruangan dan deadline yang sah pada keduanya.
6. Tekan **Konfirmasi Pinjam** di A, kemudian segera di B tanpa memuat ulang formulir B. Bila dilakukan dua orang, tombol dapat ditekan bersamaan. Hanya satu permintaan POST boleh mendapat **201**; yang lain harus **409** dengan pesan konflik yang tercantum di atas. Jika A sudah berhasil dahulu, B harus ditolak walaupun formulir B masih menampilkan kondisi lama “Tersedia”.
7. Muat ulang tab Peminjaman. Untuk barang uji tersebut harus ada tepat **satu peminjaman aktif**. Periksa Riwayat → Peminjaman dan Riwayat → Aktivitas (Log): hanya satu transaksi baru dan satu log CREATE PEMINJAMAN untuk percobaan ini. Hitung berdasarkan barang, nama peminjam, dan waktu percobaan; log lain dari pekerjaan sebelumnya tidak ikut dihitung.
8. Kembalikan barang lewat tombol **Kembalikan**. Periksa transaksi menjadi SELESAI dan barang kembali TERSEDIA. Coba pinjam lagi sekali: harus berhasil. Kembalikan kembali agar barang uji tersedia setelah pemeriksaan.

Langkah dua formulir juga menguji penolakan formulir yang datanya sudah kedaluwarsa. Bukti kedua transaksi benar-benar bertumpang tindih di database berasal dari tes integrasi di atas. Untuk menilai hasil lokal, kirim status HTTP kedua POST, pesan konflik, serta jumlah pinjaman aktif untuk barang uji. Jangan menyertakan cookie atau password.

## Mengulang tes PostgreSQL secara terpisah

Tes ini opsional untuk crosscheck lokal karena sudah dijalankan di cloud. Diperlukan PostgreSQL lokal dengan akun yang dapat membuat database. Script hanya menargetkan database baru bernama `fti_loan_test_<id-acak>` dan menolaknya jika alamat server bukan localhost. Koneksi admin dipakai untuk membuat/menghapus database uji; tidak dipakai untuk mengubah tabel aplikasi yang sudah ada.

```powershell
npm run build
$env:TEST_DATABASE_ADMIN_URL = "<koneksi PostgreSQL lokal dengan izin CREATEDB>"
node --test tests/peminjaman-concurrency.integration.mjs
Remove-Item Env:TEST_DATABASE_ADMIN_URL
```

Ganti placeholder secara lokal; jangan kirim nilainya melalui chat atau menyimpannya di Git. Tes menyalakan Next.js pada port kosong, menyiapkan data uji sendiri, memeriksa kegagalan transaksi dengan trigger, lalu menghentikan server dan menghapus database uji. Tidak perlu menjalankan server aplikasi utama untuk tes ini. Hasil yang diharapkan: 8 pass, 0 fail, 0 skipped.
