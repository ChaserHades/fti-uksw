# Catatan revisi TTU1 untuk bimbingan, 20 Oktober 2026

Naskah terbaru: [DOCX](TTU_Abiezer_Gamaliel_Revisi.docx), [PDF](TTU_Abiezer_Gamaliel_Revisi.pdf), dan [isi bab dalam Markdown](Laporan_Tugas_Talenta_Unggul.md). Versi sebelumnya tetap disimpan sebagai arsip.

## Pembaruan terakhir: koreksi penggunaan sumber

Dasar revisi adalah unggahan terbaru `TTU_Abiezer Gamaliel.docx`, yang sudah memuat perbaikan penulis. Penulis menyampaikan bahwa pengembangan berasal dari pengetahuan dan pengalaman sendiri serta tidak menggunakan artikel yang tercantum sebelumnya. Karena penggunaan referensi belum dikonfirmasi, delapan entri lama dan penanda kutipannya dikeluarkan. Tindakan ini bukan penilaian bahwa sumber tersebut tidak relevan atau salah secara ilmiah.

Bagian 1.6 mengikuti judul baru Bab II, **Dasar Pengembangan Sistem**. Bagian 2.1 menjadi **Latar Pengembangan Aplikasi**, berisi konteks pengerjaan dan hubungan data pada aplikasi. Uraian 2.3, 2.4, 2.6, serta 2.7 menjelaskan penerapan yang dapat dicocokkan dengan sistem. Dua paragraf pada 3.2 diperbaiki agar tidak menyatakan studi literatur atau penggunaan dokumentasi sebagai rujukan yang belum dikonfirmasi. Bab IV–V dan tabel hasil pengujian tetap mengikuti unggahan terbaru.

Bagian Daftar Pustaka tetap tersedia dalam struktur Word dan daftar isi, dengan catatan singkat bahwa sumber belum dilengkapi pada naskah bimbingan ini. Kebutuhan landasan teori, penelitian terdahulu, dan kesesuaian judul Bab II dengan pedoman prodi perlu dibahas bersama pembimbing. Aplikasi buatan sendiri tidak otomatis menghapus kebutuhan sumber akademik. Referensi dapat ditambahkan setelah benar-benar dibaca dan dipakai dalam pembahasan.

Perbaikan penulis seperti frasa “Pengujian berlangsung” pada 3.2 dan “Masukan dari unit SARPRAS” pada 3.3 dipertahankan. Unggahan terbaru menyisakan satu petikan kuning pada 1.1; sorotan lama tidak ditambahkan kembali. Panduan pendamping disesuaikan dengan keadaan ini dan tetap memuat bagian tanpa stabilo yang perlu dicek serta usulan dokumentasi.

Validasi revisi: hanya `word/document.xml` yang berubah dibanding paket unggahan terbaru. Seluruh bagian paket lainnya, lima pengaturan bagian halaman, kedua tabel, dan 44 field Word (satu TOC serta 43 PAGEREF) dipertahankan. Paragraf di luar lingkup perubahan identik dengan unggahan. PDF hasil render berjumlah 24 halaman; 43 nomor halaman daftar isi telah dicocokkan dengan lokasi judul. Isi bab dan tabel pada Markdown sesuai dengan DOCX. Pemeriksaan ini memvalidasi dokumen, bukan menjalankan ulang tes aplikasi.

Untuk crosscheck, gunakan langkah pada [panduan terbaru](Panduan_Penulisan_dan_Dokumentasi_TTU1.md). Berkas `TTU1_Abiezer_Google_Docs_Final.docx` di bawah merupakan versi historis. Catatan berikut merekam tahap sebelumnya; keterangan lama tentang mempertahankan daftar pustaka dan 14 sorotan sudah digantikan oleh pembaruan terakhir ini.

## Riwayat revisi sebelumnya

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
2. Buka `docs/TTU1_Abiezer_Google_Docs_Final.docx`. Pastikan judul, nama, NIM, dan halaman pengesahan sesuai data akademik.
3. Baca Bagian 3.4 dan 3.6. Cocokkan penjelasan akun petugas, nama peminjam, ruangan aset, ruangan tujuan peminjaman, dan alur QR dengan aplikasi.
4. Baca Bagian 4.7. Cocokkan hasil reset/password dengan pemeriksaan browser yang sudah dilakukan. Pastikan hasil uji yang belum dilakukan tidak berubah menjadi klaim lulus.
5. Baca Bagian 5.2–5.3 untuk bahan pembahasan keterbatasan dan pekerjaan berikutnya. Rencana Cloudflare serta Google/SSO belum ditulis sebagai fitur selesai.
6. Gunakan PDF untuk membaca atau mencetak dengan tata letak yang sudah diperiksa. Jika DOCX diedit kembali di Word, perbarui daftar isi melalui **Update Table → Update entire table**, lalu periksa nomor halaman.

Pembaruan ini tidak membutuhkan restart aplikasi atau perintah migrasi database.

## Pemeriksaan dokumen

Versi awal revisi 20 Oktober dirender menjadi PDF 23 halaman; isi 143 paragraf bab dan seluruh sel tabel pengujian dicocokkan dengan Markdown. Pemeriksaan format lanjutan di bawah mengikuti file asli yang diunggah kembali oleh pengembang.

## Penyesuaian format berdasarkan unggahan asli

File utama sekarang bernama `TTU1_Abiezer_Google_Docs_Final.docx`. File ini dibentuk dari paket DOCX unggahan pengguna, dengan isi bab dari revisi yang telah diselaraskan dengan aplikasi. Format paragraf dan penomoran bertingkat mengikuti unggahan asli. Bagian paket seperti header, footer, gambar, numbering, relasi, dan pengaturan halaman tidak diganti. Gaya dokumen lama dipertahankan; tiga gaya TOC ditambahkan agar pembaruan daftar isi menggunakan Times New Roman 12 pt dan tab titik-titik.

Daftar isi tetap menggunakan field `TOC` dengan cakupan Heading 1–3. Nomor halamannya memakai field `PAGEREF` yang menunjuk bookmark judul. Empat subbab 3.6.1–3.6.4 ditambahkan ke tampilan daftar isi sehingga terdapat 43 entri. Pengaturan `updateFields` dari dokumen asli tetap aktif. Nomor halaman pada header/footer tetap berupa field Word, bukan angka yang diketik manual.

Untuk memeriksa di Microsoft Word:

1. Buka DOCX dan aktifkan pengeditan apabila masih berada dalam Protected View.
2. Klik daftar isi → **Update Table / Perbarui Tabel** → **Update entire table / Perbarui seluruh tabel**. Nomor halaman akan mengikuti tata letak Word pada komputer yang digunakan.
3. Pada salinan percobaan, tambahkan satu page break sebelum Bab IV, lalu ulangi pembaruan daftar isi. Periksa perubahan nomor halaman Bab IV dan bagian berikutnya.
4. Hapus page break percobaan dan perbarui kembali. Untuk memperbarui semua field dokumen, gunakan **Ctrl+A**, lalu **F9** (atau **Fn+F9** pada keyboard tertentu).
5. Saat menambah judul baru, gunakan **Heading 1**, **Heading 2**, atau **Heading 3** sesuai tingkatnya supaya ikut masuk ke daftar isi setelah diperbarui.

Daftar isi tidak dihitung ulang pada setiap ketikan. Pembaruan dilakukan oleh Word ketika field diperbarui; PDF merupakan hasil render dengan nomor halaman pada saat dibuat. Pemeriksaan di lingkungan cloud mencakup struktur field, bookmark, kesesuaian nomor halaman PDF, dan tampilan hasil render. Interaksi tombol Update Table pada Microsoft Word perlu dicoba pada komputer pengguna.

Hasil pemeriksaan sebelum penyesuaian bahasa: 23 halaman PDF, 43 referensi halaman yang cocok, serta 143 paragraf bab dan semua sel tabel pengujian sesuai dengan Markdown. Struktur field berpasangan dengan benar dan semua target bookmark tersedia. Dari seluruh bagian paket DOCX unggahan, hanya `word/document.xml` (isi) serta `word/styles.xml` (penambahan gaya TOC) yang berubah. Seluruh gaya lama dan lima pengaturan bagian halaman tetap sama. Sorotan kuning dari unggahan asli dipertahankan.

## Penyesuaian bahasa berdasarkan naskah awal penulis

Unggahan `TTU1_Abiezer.docx` digunakan sebagai referensi gaya bahasa. Isi file yang terbaca memuat Bab I dan Bab II sampai Bagian 2.3, diikuti judul Daftar Pustaka. Penyesuaian mengikuti cara naskah tersebut menjelaskan persoalan operasional terlebih dahulu, lalu alur sistem serta alasan pemilihan teknologinya. Susunan lima bab pada naskah lengkap tetap dipakai.

Sebanyak 20 paragraf pada Bab IV dan V ditulis ulang. Kalimat diarahkan pada pekerjaan petugas, hubungan data, dan hasil yang dapat diamati. Rincian pemeriksaan tetap dicatat pada tabel pengujian serta panduan verifikasi. Fakta lama yang sudah dikoreksi—seperti registrasi otomatis dari QR yang tidak dikenal, klaim penerapan hosting, atau hasil pengujian yang belum tersedia—tidak diambil kembali dari naskah referensi. Tidak ditambahkan pengalaman, kutipan wawancara, maupun hasil ukur baru.

Isi Bab I–III, judul bab/subbab, daftar pustaka, dan tabel hasil pengujian tetap mengikuti versi sebelumnya. Margin, format paragraf, penomoran, sorotan kuning, serta field daftar isi dipertahankan. Setelah penyesuaian bahasa, PDF berjumlah 24 halaman; nomor halaman pada 43 entri daftar isi diperbarui mengikuti hasil render terbaru. Isi bab tetap diselaraskan dengan laporan Markdown.

Untuk crosscheck, baca Bagian 4.2, 4.4, dan 4.8 untuk membandingkan gaya penjelasan dengan naskah awal. Periksa kembali Bagian 4.7 agar hasil pengujian tetap sesuai dengan pemeriksaan yang sudah dilakukan, lalu perbarui seluruh daftar isi di Word apabila tata letak pada komputer pengguna berubah.

## Ralat acuan gaya dan penggunaan stabilo

Penulis menegaskan bahwa acuan gaya pada `TTU1_Abiezer.docx` hanya sampai **2.3 Metode Pengembangan Sistem**. Pada naskah lengkap, materi metode pengembangan berada di 3.3; susunan lima bab tetap digunakan.

Aturan stabilo berikut menggantikan keputusan sebelumnya untuk mempertahankan semua sorotan lama. Seluruh sorotan lama dihapus, kemudian 14 petikan narasi dipilih untuk ditulis ulang dengan bahasa penulis sendiri. Sorotan tidak diterapkan pada judul, daftar isi, nomor halaman, tabel hasil pengujian, maupun daftar pustaka. Nama fitur, status, angka, dan hasil teknis tidak ditandai untuk diganti secara bebas. Isi teks, tata letak paragraf, serta field Word tidak diubah pada tahap penandaan ini.

[Panduan Penulisan dan Dokumentasi TTU1](Panduan_Penulisan_dan_Dokumentasi_TTU1.md) memuat lokasi dan arah penulisan ulang setiap petikan, bagian tanpa stabilo yang perlu diverifikasi, serta bukti yang dapat ditambahkan ke tiap bab. Tanpa stabilo tidak berarti suatu klaim sudah otomatis terverifikasi. PDF tetap 24 halaman, dengan 43 referensi daftar isi yang diperiksa kembali.
