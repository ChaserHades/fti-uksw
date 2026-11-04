# Perbaikan 07: validasi input Cashflow

Pemeriksaan cloud: 4 November 2026. Crosscheck lokal pengguna belum dikonfirmasi.

## Masalah dan lingkup

Tahap ini melanjutkan validasi masukan nomor 6, khusus daftar, tambah, dan edit pengeluaran. POST sebelumnya memakai `parseFloat`, sehingga `1000abc` dapat tercatat sebagai 1000. PUT belum memeriksa nominal positif, tanggal valid, dan jenis pengeluaran. JSON `barangIds` yang rusak atau file yang dikirim pada field teks dapat menyebabkan 500. Pada POST, kelompok pembelian dapat dibuat sebelum daftar barang dan ekstensi nota diperiksa.

Validasi sekarang dilakukan sebelum akses data bisnis. Masukan salah mendapat **HTTP 400** dengan pesan JSON. Pemeriksaan sesi dan izin tetap berjalan lebih dahulu; pembacaan akun untuk autentikasi tidak termasuk akses data bisnis yang ditunda. ADMIN tetap satu-satunya role yang dapat menambah/mengedit pengeluaran.

| Isian | Aturan |
| --- | --- |
| Body | Form data yang bisa dibaca, sesuai pengiriman formulir aplikasi. |
| Judul | Teks, bukan kosong atau hanya spasi. |
| Nominal | Angka finite lebih dari nol. Desimal dan notasi ilmiah masih diterima; `1000abc`, Infinity, NaN, angka nol/negatif ditolak. Tidak ada pembulatan atau perubahan tipe Float database. |
| Tanggal | Tanggal kalender valid dalam format YYYY-MM-DD, atau timestamp ISO 8601 dengan zona waktu. Tanggal lampau tetap diterima. |
| Jenis | PEMBELIAN_ASET, MAINTENANCE, atau LAINNYA. |
| Pembelian ke | Opsional. Jika diisi, bilangan bulat 1–2147483647 sesuai batas kolom Int PostgreSQL. Kosong/tidak dikirim menjadi null. |
| Barang terkait | JSON array berisi ID teks yang tidak kosong. Tidak dikirim/kosong menjadi array kosong untuk parsing. Pada PUT, field yang tidak dikirim tetap mempertahankan relasi; array eksplisit `[]` tetap mengosongkan relasi. |
| Isian tambahan | Nama barang, progdi, deskripsi, keterangan, jenis bukti, nomor bukti harus berupa teks bila dikirim. |
| Nota | Harus file. Daftar ekstensi tetap jpg, jpeg, png, gif, webp, pdf, doc, docx. File berukuran nol tetap dilewati. Seluruh ekstensi diperiksa sebelum pembuatan kelompok pembelian. |
| Query daftar | Limit 1–500, default 50 jika kosong/tidak dikirim. Jenis hanya tiga nilai di atas atau kosong untuk semua jenis. Pencarian dan cursor tetap. |

Validasi ini memeriksa bentuk daftar ID, bukan memastikan setiap ID ada di database. Pemeriksaan isi file, batas ukuran upload, dan penyimpanan atomik saat terjadi gangguan database belum termasuk tahap ini. Penolakan input tidak membuat kelompok, pengeluaran, perubahan barang, atau log. Itu berbeda dari jaminan rollback saat kegagalan database di tengah penyimpanan, yang belum diterapkan untuk Cashflow.

Tidak ada perubahan formulir, navigasi, schema/migrasi, dependensi, kode pembelian, rumus total, mekanisme lampiran, role, atau dokumen skripsi.

## Berkas yang disentuh

- `app/api/pengeluaran/route.ts`: validasi query GET dan form POST sebelum operasi bisnis.
- `app/api/pengeluaran/[id]/route.ts`: validasi form PUT; GET detail dan DELETE tetap.
- `lib/pengeluaran-input.ts`: helper validasi memakai Zod yang sudah tersedia.
- `tests/pengeluaran-input.test.mjs`: tes handler dengan batas Prisma berupa fixture.
- `tests/pengeluaran-input.integration.mjs`: tes HTTP/Prisma/PostgreSQL pada database terpisah.
- Panduan ini.

## Hasil pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| Unit/regresi `node --test tests/*.test.mjs` | **119 pass, 0 fail, 0 skipped**. Mencakup 95 tes sebelumnya dan 24 tes baru dengan beberapa variasi input per tes. |
| HTTP/PostgreSQL | **6 skenario lulus**; runner menghitung **7 pass** termasuk tes induk. |
| Tambah invalid | Snapshot tabel pengeluaran, kelompok pembelian, barang, dan log tetap identik setelah setiap penolakan. Termasuk nota tidak didukung setelah pembelian ke diisi. |
| Edit invalid | Nilai, timestamp, lampiran, kelompok, relasi barang, serta log yang sudah tersimpan tetap identik. |
| Tambah/edit normal | Nominal desimal tersimpan, lampiran berekstensi .pdf tersimpan, kelompok dan barang terhubung, log tercatat. Edit menambahkan lampiran tanpa menghapus yang lama; relasi tidak berubah bila field barangIds tidak dikirim. Array eksplisit kosong menghapus relasi sesuai mekanisme lama. |
| Query dan izin | Daftar/filter/pencarian normal 200, query invalid 400, anonim 401, mutasi Teknisi/Universitas 403. |
| Build | `npm run build` berhasil. Konfigurasi lama melewati pemeriksaan tipe penuh saat build. |
| TypeScript terarah | Tidak ada diagnostik pada dua route dan helper beserta dependensinya. |
| Lint | Tidak ada temuan baru. Satu temuan lama pada masing-masing route tetap ada. |

Tes integrasi membuat database baru dengan nama unik, menjalankan hasil build pada port terpisah, lalu menghentikan server dan menghapus database uji. Database aplikasi pengguna tidak digunakan untuk penulisan tes.

## Crosscheck manual

1. Hentikan server dengan Ctrl+C di `D:\ProjectTTU\fti-uksw`, lalu jalankan:

   ```powershell
   git status --short
   git pull --ff-only origin main
   node --test tests/*.test.mjs
   npm run dev
   ```

   Harapannya 119 tes lulus. Tidak perlu migrate, reset, seed, atau install paket baru. Jika perubahan lokal menghalangi pull, simpan dahulu tanpa reset hard. Untuk mode produksi, jalankan `npm run build` lalu `npm run start`.

2. Login ADMIN → Manajemen Aset → Cashflow. Buka DevTools → Network → Fetch/XHR dan aktifkan Disable cache. Daftar dan filter jenis harus mendapatkan 200.

3. Tambah **data uji** berjudul `UJI-07-CASHFLOW`, nominal `1000.50`, tanggal hari ini, jenis LAINNYA. Opsional: gunakan PDF uji, bukan nota operasional. Simpan: POST harus **201**. Nominal harus tetap 1000,50. Salin ID pengeluaran uji dari Response untuk pemeriksaan langkah 5.

4. Edit data uji tersebut menjadi nominal `2000.75`, simpan: PUT harus **200** dan nominal tampil 2000,75. Bila menambah lampiran kedua, lampiran pertama tetap ada. Jika menguji hubungan aset/kelompok pembelian, gunakan barang uji dan periksa kembali hubungan tersebut setelah menyimpan.

5. Di Console, ganti placeholder ID berikut dengan ID pengeluaran uji dari langkah 3, lalu jalankan. Seluruh contoh sengaja salah dan harus ditolak sebelum penyimpanan:

   ```javascript
   const idUji07 = "GANTI_DENGAN_ID_PENGELUARAN_UJI";
   if (idUji07 === "GANTI_DENGAN_ID_PENGELUARAN_UJI") {
     throw new Error("Isi ID data uji terlebih dahulu");
   }
   for (const [method, url] of [
     ["POST", "/api/pengeluaran"],
     ["PUT", `/api/pengeluaran/${encodeURIComponent(idUji07)}`]
   ]) {
     for (const [field, value] of [
       ["nominal", "1000abc"],
       ["nominal", "-1"],
       ["tanggal", "2026-02-30"],
       ["pembelianKe", "1.5"],
       ["barangIds", "{"],
       ["nota", "bukan file"]
     ]) {
       const fd = new FormData();
       for (const [k, v] of Object.entries({
         judul: "UJI-07-INVALID", nominal: "1000", tanggal: "2026-11-04",
         jenis: "LAINNYA", pembelianKe: "1"
       })) fd.set(k, v);
       fd.set(field, value);
       const r = await fetch(url, { method, body: fd });
       console.log(method, field, r.status, await r.json());
     }
   }
   ```

   Semuanya harus **400** dengan pesan terkait isian. Muat ulang Cashflow: tidak boleh ada `UJI-07-INVALID`; data uji yang diedit pada langkah 4 tetap bernilai 2000,75 dan lampirannya tetap. Periksa Aktivitas (Log): percobaan invalid tidak menambahkan CREATE/UPDATE pengeluaran.

6. Buka `/api/pengeluaran?limit=10junk` dan `/api/pengeluaran?jenis=SALAH` pada sesi login yang sama: masing-masing harus 400. `/api/pengeluaran?limit=500` harus 200. Jika membuka URL langsung, pilih All/Doc pada Network agar request terlihat.

7. Bersihkan hanya data uji setelah pencatatan hasil. Bila pengujian membuat kelompok atau hubungan aset, cek kembali hubungan tersebut; menghapus pengeluaran bukan jaminan kelompok pembelian ikut terhapus. Jangan hapus data operasional.

Untuk tes integrasi opsional, siapkan `TEST_DATABASE_ADMIN_URL` secara lokal pada PostgreSQL localhost dengan izin membuat database, mengikuti [panduan isolasi nomor 4](Verifikasi_Perbaikan_04.md). Setelah build jalankan `node --test tests/pengeluaran-input.integration.mjs`. Jangan memasukkan kredensial ke repository atau tangkapan layar.

## Temuan terpisah untuk pembahasan berikutnya

Formulir mengirim field `keterangan`, sedangkan POST lama menyimpan dari `deskripsi`; PUT memakai `keterangan`. Akibatnya, keterangan saat tambah dapat tidak tersimpan. Pemetaan tersebut belum diubah dalam tahap validasi ini. Penyimpanan kelompok, pengeluaran, hubungan barang, dan log juga masih berlangsung melalui beberapa operasi terpisah; penanganan rollback saat database gagal perlu dibahas sebagai lingkup berikutnya.
