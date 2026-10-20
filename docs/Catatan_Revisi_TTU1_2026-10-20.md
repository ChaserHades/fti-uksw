# Catatan revisi TTU1 untuk bimbingan, 20 Oktober 2026

Naskah utama: [DOCX](TTU1_Abiezer_Revisi_2026-10-20.docx), [PDF](TTU1_Abiezer_Revisi_2026-10-20.pdf), dan [isi bab dalam Markdown](Laporan_Tugas_Talenta_Unggul.md). Versi 19 Oktober tetap disimpan sebagai arsip.

Revisi ini hanya memperbarui dokumen. Tidak ada perubahan kode aplikasi, tampilan, alur operasional, dependensi, atau database. Pemeriksaan sumber mengacu pada keadaan repositori setelah `c9122b0`; implementasi pencabutan sesi terdapat pada `bc5ae72` dan pemulihan migrasi historis pada `c1a43c2`. Hasil tes otomatis yang dicantumkan berasal dari pemeriksaan 19 Oktober, bukan pengujian baru pada 20 Oktober.

## Bagian yang disesuaikan

| Bagian | Penyesuaian | Dasar pemeriksaan |
| --- | --- | --- |
| Kata pengantar dan Bab I | Menempatkan naskah sebagai hasil perkembangan untuk bimbingan. Wawancara dijelaskan berlangsung ketika aplikasi masih memerlukan perbaikan. Cloudflare dan Google/SSO tetap rencana. | Penjelasan pengembang; autentikasi email/password dalam `actions/auth.ts`. |
| 3.2–3.4 | Membedakan pengumpulan kebutuhan, pemeriksaan implementasi, dan penerimaan pengguna. Judul 3.4 menjadi Analisis Proses dan Kebutuhan Operasional agar uraian rancangan aplikasi tidak dianggap hasil observasi terukur atas proses lama. | Keterangan wawancara yang tersedia; tidak ada data pengukuran proses lama yang ditambahkan. |
| 3.5 | Melengkapi kebutuhan nonfungsional yang sebelumnya belum dijabarkan tersendiri. | `lib/auth.ts`, `lib/session.ts`, `lib/public-user.ts`, dan `hooks/useQrScanner.ts`. |
| 3.6.2 | Memperjelas delapan model, hubungan kelompok pembelian, serta perbedaan akun petugas dan nama peminjam aktual. | `prisma/schema.prisma`. |
| 3.6.3 dan 4.3 | Menjelaskan isi QR, pencarian berdasarkan ID, tindakan setelah pemindaian, dan lima hasil pada alur pemulihan. Penanganan AMBIGUOUS dibatasi pada alur pemulihan yang memang memilikinya. | `app/api/barang/[id]/qr/route.ts`, `helpers/format.ts`, `app/api/barang/recovery/route.ts`, `components/features/PinjamManager.tsx`. |
| 4.1–4.2 | Menyesuaikan nama menu, kondisi dan status aset, serta penghapusan dan pemulihan enam hari. | Halaman manajemen masing-masing role; endpoint aset, restore, dan hard-delete. |
| 4.5–4.6 | Memperjelas status transaksi, barang terhapus, pengeluaran, dan kelompok pembelian. Cashflow tetap dibahas sebagai pencatatan pengeluaran. | Endpoint peminjaman/pengembalian, model Pengeluaran dan KelompokPembelian. |
| 4.7–4.8 dan Bab V | Membedakan tes otomatis, PostgreSQL uji, pengujian HTTP, dan pemeriksaan browser lokal. Uji perubahan password bersamaan tidak disebut sebagai uji peminjaman bersamaan. | `tests/api-user-privacy.test.mjs`, `tests/session-access.test.mjs`, dan [catatan verifikasi](Verifikasi_Perbaikan_03.md). |

## Batas bukti dan bahan bimbingan

Pengembang telah mengonfirmasi akses normal Admin serta skenario utama reset dan penggantian password. Sesi lama ditolak, sesi baru dapat membaca profil, dan akun lain tetap mendapat akses. Pemeriksaan tersebut belum merupakan UAT bersama SARPRAS untuk seluruh aplikasi. Naskah tidak menambahkan angka efisiensi, skor kepuasan, hasil uji beban, atau klaim aplikasi telah dipublikasikan.

Tanggal, identitas narasumber, pertanyaan, dan ringkasan jawaban wawancara belum tersedia pada bahan yang ditinjau. Lengkapi bagian bukti kegiatan dari catatan asli ketika dibahas bersama pembimbing. Nama pejabat serta pembimbing pada halaman awal dipertahankan dari dokumen pengguna; tidak ditambahkan tanda tangan atau klaim pengesahan baru.

Daftar pustaka dipertahankan dari naskah sebelumnya. Metadata dan uraian penelitian pada referensi [1]–[2] belum berhasil diverifikasi ulang ke penerbit/Crossref karena akses jaringan ke layanan tersebut ditolak. Cocokkan judul, penulis, tahun, serta isi pembahasannya dengan artikel asli sebelum penyerahan final. Catatan ini bukan pernyataan bahwa referensinya salah.

Penerapan Cloudflare dan Google/SSO, pengujian kamera lintas perangkat, pengujian beban, dan penerimaan pengguna masih perlu dikerjakan. Prioritas perbaikan aplikasi yang disebut dalam naskah adalah peminjaman serentak, aturan keterlambatan, dan validasi masukan. Revisi dokumen ini tidak mengeksekusi perbaikan tersebut.

## Crosscheck manual dokumen

1. Jalankan `git status --short`, kemudian `git pull --ff-only origin main` dari folder proyek. Jika perubahan lokal menghalangi pull, simpan dan periksa perubahan tersebut terlebih dahulu. Cadangan laporan yang sebelumnya dibuat dengan Git stash tetap terpisah; jangan menimpakannya langsung ke naskah terbaru.
2. Buka `docs/TTU1_Abiezer_Revisi_2026-10-20.docx`. Pastikan judul, nama, NIM, dan halaman pengesahan sesuai data akademik.
3. Baca Bagian 3.4 dan 3.6. Cocokkan penjelasan akun petugas, nama peminjam, ruangan aset, ruangan tujuan peminjaman, dan alur QR dengan aplikasi.
4. Baca Bagian 4.7. Cocokkan hasil reset/password dengan pemeriksaan browser yang sudah dilakukan. Pastikan hasil uji yang belum dilakukan tidak berubah menjadi klaim lulus.
5. Baca Bagian 5.2–5.3 untuk bahan pembahasan keterbatasan dan pekerjaan berikutnya. Rencana Cloudflare serta Google/SSO belum ditulis sebagai fitur selesai.
6. Gunakan PDF untuk membaca atau mencetak dengan tata letak yang sudah diperiksa. Jika DOCX diedit kembali di Word, perbarui daftar isi melalui **Update Table → Update entire table**, lalu periksa nomor halaman.

Pembaruan ini tidak membutuhkan restart aplikasi atau perintah migrasi database.

## Pemeriksaan dokumen

DOCX dirender menjadi PDF 23 halaman. Isi 143 paragraf bab dan seluruh sel tabel pengujian dicocokkan dengan Markdown. Sebanyak 39 nomor halaman daftar isi diperiksa terhadap judul pada PDF. Logo, tabel identitas, dan lima bagian dokumen dipertahankan; pemeriksaan halaman tidak menemukan halaman kosong atau teks keluar dari batas kertas. Sampul, daftar isi, dan tabel hasil pengujian juga diperiksa secara visual.
