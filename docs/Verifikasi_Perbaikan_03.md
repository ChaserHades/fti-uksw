# Perbaikan 03: pencabutan sesi setelah perubahan password

Revisi 19 Oktober 2026, implementasi `bc5ae72`. Panduan ini mendampingi [laporan TTU](Laporan_Tugas_Talenta_Unggul.md) dan [TTU1 untuk bimbingan 20 Oktober 2026](TTU1_Abiezer_Revisi_2026-10-20.docx).

## Perubahan dan dampak

Sebelumnya, reset password mengaktifkan `mustChangePassword`, tetapi cookie lama belum dicabut secara permanen. Ketika kewajiban ganti password selesai, cookie itu berpotensi kembali mendapat akses. Sekarang `users.sessionVersion` disimpan pada JWT dan dibandingkan dengan database. Reset Admin dan pergantian password menaikkan nilainya secara atomik. Versi yang berbeda menyebabkan sesi ditolak.

| Bagian | Perubahan |
| --- | --- |
| `prisma/schema.prisma` dan migrasi `20261019070000_add_session_version` | Menambah satu kolom integer, `sessionVersion`, dengan nilai awal 0. Data dan hash password lama tetap disimpan. |
| `lib/session.ts` | Memasukkan versi ke sesi dan memeriksa kecocokannya dengan akun. Cookie tanpa versi ditolak. |
| `actions/auth.ts` | Login memakai versi dari akun yang password-nya diverifikasi. Ganti password menaikkan versi, dengan syarat versi lama masih cocok, lalu menerbitkan cookie baru. |
| `app/api/users/[id]/reset-password/route.ts` | Reset menaikkan versi dan mengaktifkan kewajiban ganti password dalam pembaruan yang sama. |
| Berkas Prisma yang sudah dilacak Git | Diperbarui melalui `prisma generate` agar mengikuti schema. |
| `tests/api-user-privacy.test.mjs`, `tests/session-access.test.mjs` | Memeriksa kembali respons pengguna, akses, pencabutan sesi, serta perubahan password bersamaan. |

Alur inventaris, peminjaman, pengeluaran, formulir, dan pembagian role tidak diubah pada tahap ini. Cookie sebelum pembaruan tidak memiliki versi; seluruh pengguna perlu login ulang sekali setelah pemasangan. Logout biasa tetap menghapus cookie browser saat ini, bukan semua perangkat.

## Pemasangan lokal

Jalankan PowerShell dari `D:\ProjectTTU\fti-uksw`. Pastikan database yang ditunjuk `.env` adalah database aplikasi yang memang hendak diperbarui. Jangan membagikan isi `.env` atau connection string.

1. Hentikan server pengembangan dengan `Ctrl+C`. Periksa perubahan lokal, lalu ambil pembaruan:

   ```powershell
   git status --short
   git pull --ff-only origin main
   ```

   Jika Git melaporkan konflik atau perubahan lokal yang menghalangi pull, simpan hasilnya untuk diperiksa. Jangan gunakan `reset --hard`.

2. Periksa riwayat migrasi sebelum menjalankan perubahan database:

   ```powershell
   npx prisma migrate status
   ```

   Repositori sekarang berisi delapan migrasi, termasuk migrasi historis `20261002072806_add_superadmin_role` yang dipulihkan. Untuk database lokal yang telah diperiksa, lanjut ke langkah 3 jika tujuh migrasi lama sudah tercatat selesai dan hanya `20261019070000_add_session_version` yang belum diterapkan. Jika migrasi baru sudah selesai, lewati langkah deploy. Jika database pernah dibuat dengan `db push`, tidak memiliki tabel riwayat migrasi, mempunyai migrasi gagal, atau menampilkan migrasi lama sebagai pending, hentikan bagian migrasi dan kirim keluaran status untuk diperiksa. Migrasi lama dalam repositori memuat perubahan penghapusan tabel/kolom; jangan menjalankan semuanya begitu saja pada database berisi data.

3. Setelah riwayat sesuai, buat cadangan melalui alat database yang biasa dipakai, lalu terapkan migrasi dan perbarui Prisma Client:

   ```powershell
   npx prisma migrate deploy
   npx prisma generate
   npx prisma migrate status
   ```

   Hasil yang diharapkan: migrasi berhasil dan tidak ada migrasi tertunda. Tahap ini tidak membutuhkan `migrate reset`, seed ulang, maupun `db push --accept-data-loss`.

4. Jalankan tes dan server:

   ```powershell
   node --test tests/*.test.mjs
   npm run dev
   ```

   Hasil tes yang diharapkan: 60 pass, 0 fail. Semua tes pada perintah ini memakai database tiruan sehingga tidak menulis data aplikasi. Untuk mode produksi lokal, gunakan `npm run build` lalu `npm run start`.

## Crosscheck manual

### Pemulihan riwayat migrasi lokal

Database lokal mencatat `20261002072806_add_superadmin_role` sebagai migrasi selesai tanpa rollback. File yang hilang dipulihkan setelah perbandingan checksum di database menghasilkan `true`. SHA-256 file tersebut adalah `ed2afbf93fda096aba010bec7c9bcb8a7e71146d899b36ce93aa36716c9c1535`. Aturan `.gitattributes` mempertahankan akhiran baris LF khusus untuk file ini agar checkout Windows tidak mengubah byte-nya.

SQL historis itu menambahkan nilai enum `SUPERADMIN`. Pemulihan file tidak memberikan hak akses baru pada aplikasi; role yang didukung alur aplikasi tetap ADMIN, TEKNISI, dan UNIVERSITAS. Pada database yang telah mencatat migrasi ini selesai, `migrate deploy` tidak menjalankannya ulang. Riwayat `_prisma_migrations` dan role akun tidak perlu diedit manual. Ketika delapan file tersedia, pemeriksaan status seharusnya hanya menyebut migrasi `add_session_version` sebagai tertunda, tanpa peringatan migrasi database yang hilang secara lokal.

### Pemeriksaan sesi setelah migrasi

Pemulihan riwayat diuji pada PostgreSQL terpisah dengan tujuh migrasi lama sudah diterapkan. Pemeriksaan status hanya menyebut `add_session_version` sebagai tertunda; deploy menerapkan satu migrasi tersebut dan status berikutnya menyatakan database sudah mutakhir. Akun fixture, role, serta hash password tetap tersimpan, dengan `sessionVersion` awal 0.

Gunakan akun Teknisi uji. Reset password memang mengubah password akun tersebut. Jangan gunakan akun Admin utama sebagai sasaran reset.

Siapkan tiga sesi browser yang terpisah: A untuk Admin utama, B dan C untuk akun Teknisi uji yang sama. Contoh: A di Chrome biasa, B di Chrome Incognito, dan C di Firefox. Dua jendela Incognito Chrome berbagi cookie, sehingga tidak cocok dijadikan B dan C sekaligus.

1. Login baru pada ketiga sesi. Di B dan C, buka `http://localhost:3000/api/me`. Harapannya HTTP 200 dengan role TEKNISI. Pada A, periksa kembali Dashboard, Peminjaman, Riwayat, Cashflow, dan Tim & Verifikasi.
2. Buka DevTools → Network → **All**, aktifkan **Disable cache**. Filter All diperlukan karena URL API yang diketik langsung di address bar termasuk permintaan dokumen.
3. Dari A, buka Tim & Verifikasi dan gunakan tombol reset password pada akun uji. Simpan password sementara untuk pengujian ini tanpa mengirimkannya lewat chat.
4. Tanpa logout atau login ulang pada B dan C, muat ulang `/api/me`. Keduanya harus mendapatkan HTTP **401**. A tetap dapat menggunakan akun Admin. Halaman terlindungi pada sesi lama mengarahkan ke `/login` ketika diminta kembali.
5. Login ulang pada B dan C menggunakan password sementara. Keduanya diarahkan ke halaman wajib ganti password. Buka `/api/me` pada tab lain di setiap browser: hasilnya **403**, karena sesi baru sah tetapi akun masih wajib mengganti password. Pertahankan halaman ganti password di B.
6. Di B, isi password baru dan konfirmasinya, lalu simpan. B mendapat sesi baru. Buka langsung `/petugas/dashboard` dan `/api/me` di B: akses harus berhasil, dengan HTTP **200** untuk `/api/me`. Halaman ganti password saat ini mengarahkan ke `/`, yang masih mengarah ke `/login`; perilaku lama itu belum diubah dalam tahap ini. Gunakan URL dashboard langsung untuk memeriksa sesi baru.
7. Tanpa login ulang di C, muat ulang `/api/me`. Hasilnya harus **401**, sekalipun kewajiban ganti password sudah selesai di B. Ini membuktikan sesi yang diterbitkan sebelum perubahan kedua juga dicabut.
8. Logout dari C, lalu coba login menggunakan password sementara: harus ditolak. Login menggunakan password baru: harus berhasil. Lakukan pembersihan akun uji sesuai kebutuhan pengujian Anda.
9. Pada Admin, periksa respons `peminjaman` yang memiliki data. Profil petugas harus tetap tersedia dan field `password` tidak boleh muncul. Selesai menguji, pastikan alur utama masih dapat dibuka dengan akun yang disetujui.

Catat langkah yang gagal, URL, status HTTP, dan pesan error. Jangan mengirim cookie, JWT, password, atau URL database. Layar yang sudah terbuka tidak otomatis hilang ketika sesi dicabut; pemeriksaan terjadi pada permintaan berikutnya.

## Hasil pemeriksaan cloud

| Pemeriksaan | Hasil dan batasnya |
| --- | --- |
| `node --test tests/*.test.mjs` | 60 lulus: 13 tes privasi respons dan 47 tes sesi/akses. JWT dan bcrypt memakai library nyata; database dan cookie diisolasi dalam fixture. |
| Migrasi PostgreSQL | Seluruh SQL migrasi dijalankan pada database uji kosong; akun fixture dimasukkan sebelum migrasi baru. Data akun dan hash tetap, kolom baru bernilai 0. Database pengguna tidak digunakan. |
| Prisma dan PostgreSQL | Increment versi atomik terverifikasi; pembaruan memakai versi lama ditolak; dua pergantian serentak dengan versi awal sama menghasilkan satu keberhasilan. |
| HTTP Next.js dengan PostgreSQL uji | Akses anonim dan token tanpa versi ditolak 401; role Teknisi ditolak pada API Admin; reset mencabut sesi target, sesi Admin tetap sah, dan sesi wajib ganti password mendapat 403. |
| `npm run build` | Berhasil. Konfigurasi lama `ignoreBuildErrors: true` masih berlaku. |
| TypeScript terarah dan lint | Tidak ada diagnostik pada tiga berkas autentikasi yang diubah beserta dependensinya. Tidak ada temuan lint baru pada ketiganya. Ini bukan klaim seluruh proyek bebas error tipe/lint. |
| Pemeriksaan manual pengguna | Akses normal Admin dan respons tanpa hash sudah dikonfirmasi. Skenario utama reset dan penggantian password juga telah diperiksa di browser lokal; rincian bukti dicatat di bawah. |

## Hasil crosscheck manual 19 Oktober 2026

Pengembang menjalankan pemeriksaan di localhost dan memberikan hasil serta tangkapan layar. Skenario utama pencabutan sesi menunjukkan hasil berikut.

| Langkah yang diperiksa | Hasil yang dilaporkan atau terlihat |
| --- | --- |
| Akses awal Teknisi dan Universitas | `/api/me` mengembalikan HTTP 200 dan profil sesuai akun pada kedua sesi. |
| Admin mereset password Teknisi | Sesi Teknisi lama mendapat HTTP 401 tanpa login ulang. Hasil ini dikonfirmasi pengembang. |
| Akun Universitas setelah reset Teknisi | Tetap HTTP 200; reset akun Teknisi tidak mencabut sesi akun Universitas. |
| Login Teknisi dengan password sementara | Halaman wajib ganti password tampil. `/api/me` menampilkan pesan wajib mengganti password. Status HTTP pada tahap ini tidak terlihat di screenshot. |
| Sesudah password baru disimpan | Sesi baru dapat membaca profil Teknisi berstatus APPROVED melalui `/api/me`. |
| Sesi lama sesudah penggantian password | Screenshot Incognito menunjukkan `/api/me` tetap HTTP 401 dengan respons `Unauthorized`. |

Skenario utama nomor 3 telah lulus crosscheck manual. Catatan ini tidak menyatakan bahwa seluruh langkah tambahan dalam panduan, pengujian kamera, beban, atau penerimaan pengguna sudah dijalankan. Hasil tersebut dipisahkan dari 60 tes otomatis dan pemeriksaan PostgreSQL di lingkungan cloud.

## Penyelarasan laporan

Isi bab pada laporan Markdown dan TTU1 memakai uraian yang sama. Revisi mencakup model KelompokPembelian, hak akses endpoint, impor .xlsx, ekspor CSV/Excel, status peminjaman AKTIF/SELESAI, lima hasil scan pemulihan, dan pengamanan sesi.

Wawancara SARPRAS dicatat sebagai kegiatan yang telah dilakukan ketika aplikasi masih memiliki bug. Rencana Cloudflare serta login Google melalui akun mahasiswa/SSO dipisahkan dari fitur yang sudah tersedia. Login saat ini masih email dan password. Migrasi hosting dan OAuth tidak diimplementasikan pada tahap 3.

Identitas penulis, logo, lembar pengesahan, dan daftar pustaka mengikuti dokumen asli. Rujukan penelitian terdahulu belum diverifikasi ulang terhadap penerbitnya pada pekerjaan ini. Tidak ditambahkan hasil wawancara, angka peningkatan efisiensi, skor kepuasan, maupun klaim penerimaan pengguna yang belum tersedia. Jika dokumen dibuka dengan Word, perbarui daftar isi melalui klik kanan → Update Field → Update entire table sebelum pencetakan.
