# Instruksi Lanjutan Implementasi FTI-APP: Tahap 4 sampai Finishing

## Konteks Pengerjaan

Tahap 1 sampai Tahap 3 sudah selesai dikerjakan menggunakan Claude Sonnet. Tahap 4 juga sudah mulai dikerjakan oleh Claude, tetapi terhenti ketika kuota Claude habis. Dengan demikian, kondisi proyek saat ini bukan kondisi sebelum Tahap 4 dan bukan pula implementasi Tahap 4 yang sudah selesai.

Lanjutkan pekerjaan Claude dari working tree yang sekarang. Jangan mengulang, menghapus, me-reset, atau menulis ulang implementasi Tahap 1–3 maupun bagian Tahap 4 yang sudah benar.

Tugas yang harus dilakukan:

1. Memeriksa hasil implementasi yang benar-benar ada pada branch dan working tree saat ini.
2. Mengidentifikasi perubahan Tahap 4 yang sudah dibuat Claude dan bagian yang belum selesai.
3. Menyelesaikan error sintaks JSX yang menjadi titik terakhir pekerjaan Claude.
4. Melanjutkan sisa Tahap 4 sampai seluruh pekerjaan finishing selesai.
5. Mempertahankan alur dan fitur yang sudah berjalan.

Jangan menyimpulkan bahwa revisi belum dikerjakan hanya dari satu commit atau perbandingan `HEAD~3`. Audit sebelumnya yang menyatakan belum ada satu pun revisi terimplementasi tidak dapat dijadikan dasar. Tahap 1–3 sudah selesai, sedangkan Tahap 4 sudah mempunyai perubahan lokal yang belum sempat diselesaikan Claude.

Perubahan dan file yang dibuat Gemini sebelumnya sudah di-undo oleh pengguna. Karena itu:

- Jangan mencari `implementation_plan.md` buatan Gemini.
- Jangan mengoreksi atau membuat ulang `implementation_plan.md`.
- Jangan menggunakan audit atau rencana Gemini sebelumnya sebagai baseline.
- Gunakan `Revisi FTI-APP.md` dan diff working tree saat ini sebagai sumber kebenaran.
- Tampilan handoff terakhir menunjukkan empat file berubah dengan ringkasan `+151 -67`. Verifikasi jumlah dan isinya melalui Git karena angka dapat berubah setelah formatter atau perbaikan.

---

## Status Handoff dari Claude

Sebelum kuotanya habis, Claude sudah melakukan cross-check terhadap komponen Cashflow/Pengeluaran dan mulai menerapkan Tahap 4.

Kondisi terakhir yang dilaporkan Claude:

1. Build berada dalam kondisi bersih sebelum Tahap 4 mulai dikerjakan.
2. Claude membaca:
   - Komponen `LaporanManager.tsx`.
   - API Pengeluaran.
   - Model Pengeluaran pada Prisma schema.
   - Kebutuhan Cashflow dalam `Revisi FTI-APP.md`.
3. Claude menemukan bahwa model `Pengeluaran` belum memiliki `jenisBukti` dan `nomorBukti`.
4. Claude mulai menambahkan `jenisBukti` dan `nomorBukti` ke schema.
5. Claude mulai memperbarui interface `Pengeluaran` pada `types/index.ts`.
6. Claude mulai memperbarui API Pengeluaran agar membaca `jenisBukti` dan `nomorBukti` serta menghasilkan kode lengkap.
7. Claude mulai memperbarui `LaporanManager.tsx` untuk:
   - Dropdown jenis bukti SPB/Kwitansi/Nota.
   - Input nomor bukti.
   - Preview kode pembayaran lengkap.
   - Preview nota horizontal dengan scrollbar.
8. Setelah perubahan tersebut, pemeriksaan TypeScript berhenti karena struktur JSX pada `LaporanManager.tsx` belum selesai dirapikan.

Error terakhir yang dilaporkan:

```text
components/features/LaporanManager.tsx(458,8): error TS17008:
JSX element 'Modal' has no corresponding closing tag.

components/features/LaporanManager.tsx(591,11): error TS1005:
')' expected.

components/features/LaporanManager.tsx(636,7): error TS1128:
Declaration or statement expected.

components/features/LaporanManager.tsx(680,5): error TS1128:
Declaration or statement expected.

components/features/LaporanManager.tsx(681,3): error TS1109:
Expression expected.

components/features/LaporanManager.tsx(682,1): error TS1128:
Declaration or statement expected.
```

Claude sudah mempersempit dugaan masalah ke area preview nota:

- Area sekitar Modal Cashflow/Pengeluaran.
- Container preview horizontal.
- Bagian `Add New Nota Inline`.
- Kemungkinan terdapat penutup `</div>` berlebih atau berada pada tingkat nesting yang salah.
- Nomor baris dapat berubah, sehingga gunakan struktur JSX aktual, bukan hanya nomor baris di atas.

Ini adalah titik lanjut utama. Jangan membuang seluruh perubahan `LaporanManager.tsx` hanya untuk menghilangkan error. Perbaiki nesting JSX secara bedah/surgis dengan menjaga field dan preview yang sudah ditambahkan.

---

## Aturan Utama

- Baca seluruh `Revisi FTI-APP.md` sebelum mengubah kode.
- Mulai dari kode aktual, bukan asumsi dari audit sebelumnya.
- Perlakukan perubahan yang belum di-commit sebagai pekerjaan Claude yang harus dipertahankan.
- Jangan membersihkan working tree sebelum membaca seluruh diff.
- Jangan menggunakan versi pada `HEAD` untuk menimpa file yang sedang berubah.
- Jangan kembali menawarkan untuk memulai Tahap 1.
- Jangan mengubah fitur Tahap 1–3 yang sudah berjalan.
- Jangan melakukan refactor massal atau perubahan di luar cakupan revisi.
- Jangan menebak nama model, field, komponen, API, atau struktur folder.
- Jangan melakukan `git reset`, `git checkout`, atau menghapus pekerjaan yang sudah ada.
- Identifikasi file terdampak dan risiko regresi sebelum implementasi.
- Gunakan pola penulisan, arsitektur, komponen, dan mekanisme migrasi yang sudah dipakai proyek.
- Kerjakan secara bertahap dan buat commit terpisah untuk setiap bagian yang stabil.

---

## Audit Ulang yang Wajib Dilakukan

Jalankan pemeriksaan berikut:

```bash
git status --short
git branch --show-current
git log --oneline --decorate -30
git diff --stat
git diff --name-only
git diff -- prisma/schema.prisma
git diff -- types/index.ts
git diff -- app/api/pengeluaran/route.ts
git diff -- components/features/LaporanManager.tsx
rg -n "namaBarang|progdi|kodePembelian|jenisBukti|nomorBukti|purchase|cashflow" prisma app components
```

Jika direktori proyek berbeda, sesuaikan pencarian tanpa mengubah kode.

Jika path API atau komponen aktual berbeda, temukan path yang benar melalui `rg --files`. Jangan menganggap file tidak ada hanya karena contoh path di atas berbeda.

Periksa secara langsung apakah hasil Tahap 1–3 berikut sudah ada:

1. Field `namaBarang` dan `progdi`.
2. Generator label dengan pola kategori, merek, bulan, tahun, dan urutan pembelian.
3. Urutan input pada form tambah barang.
4. Dropdown Progdi.
5. Preview label otomatis.
6. Tabel barang dengan Nama Barang dan badge status.
7. Perubahan Cashflow yang sudah mulai dikerjakan Claude.
8. Preview bukti pembayaran horizontal.
9. API dan validasi yang sudah ditambahkan Claude.
10. Diff parsial pada schema, types, API Pengeluaran, dan `LaporanManager.tsx`.

Setelah audit, tulis ringkasan singkat:

- Branch dan commit aktif.
- Fitur Tahap 1–3 yang ditemukan.
- File Tahap 4 yang sudah diubah Claude.
- Bagian perubahan Claude yang sudah benar.
- Bagian yang belum selesai atau masih bermasalah.
- Risiko regresi jika Tahap 4 diterapkan.

Jangan melanjutkan berdasarkan kesimpulan audit lama apabila bertentangan dengan kondisi kode aktual.

---

# Tahap 4A — Selesaikan Implementasi Cashflow yang Ditinggalkan Claude

Tahap ini harus dikerjakan sebelum menambah arsitektur sinkronisasi baru.

## 4A.1 Selamatkan Perubahan Parsial

Gunakan `git diff` untuk membaca perubahan Claude pada:

- `prisma/schema.prisma`
- `types/index.ts`
- API Pengeluaran
- `components/features/LaporanManager.tsx`

Periksa setiap hunk dan klasifikasikan:

- Sudah benar dan harus dipertahankan.
- Sudah benar tetapi belum lengkap.
- Menimbulkan error sintaks atau type.
- Tidak sesuai dengan `Revisi FTI-APP.md`.

Jangan menulis ulang seluruh file. Pertahankan bagian yang valid dan perbaiki bagian yang benar-benar bermasalah.

## 4A.2 Perbaiki Nesting JSX Terlebih Dahulu

Fokus pertama adalah error pada `LaporanManager.tsx`.

Periksa struktur:

```text
Modal
└── Container utama form
    ├── Field Cashflow
    ├── Container preview horizontal
    │   └── Daftar preview dokumen
    └── Add New Nota Inline
```

Pastikan:

- Setiap tag pembuka mempunyai tag penutup yang sesuai.
- `Add New Nota Inline` masih berada di dalam Modal.
- Container preview horizontal ditutup pada posisi yang benar.
- Tidak ada `</div>` ekstra.
- Perubahan tidak menghilangkan handler upload, delete, download, atau preview yang sudah ada.

Gunakan formatter atau parser setelah perbaikan untuk memastikan struktur JSX valid.

## 4A.3 Jalankan Typecheck Bertahap

Setelah syntax JSX valid, jalankan kembali perintah typecheck proyek.

Contoh dari pekerjaan Claude:

```bash
bunx tsc --noEmit
```

Gunakan package manager aktual repository. Jangan mengganti package manager tanpa alasan.

Jika muncul error berikutnya:

1. Perbaiki error yang berasal dari perubahan Tahap 4.
2. Jangan menyembunyikan error dengan `any`, `@ts-ignore`, atau menonaktifkan lint.
3. Pastikan interface `Pengeluaran`, form state, body request, response API, dan Prisma client menggunakan field yang konsisten.
4. Jalankan typecheck ulang sampai tidak ada error.

## 4A.4 Verifikasi Implementasi Cashflow Claude

Setelah kompilasi pulih, verifikasi:

- `jenisBukti` tersedia dengan pilihan SPB, Kwitansi, dan Nota.
- `nomorBukti` menerima slash, dash, underscore, angka, dan huruf yang diperlukan.
- Jenis dan nomor bukti dikirim ke API.
- API menyimpan kedua field tersebut.
- Data lama yang belum memiliki field tersebut tetap dapat dibaca apabila field dibuat nullable.
- Preview kode berubah mengikuti input.
- Kode lengkap mengikuti contoh `SPB-03/290-12-072026-001`.
- Preview gambar dan PDF tetap tersedia di dalam aplikasi.
- Beberapa nota tampil secara horizontal dengan scrollbar bawah.
- Upload, hapus, download, dan preview dokumen tetap berjalan.
- Build yang sebelumnya bersih kembali bersih setelah perubahan Tahap 4.

## 4A.5 Bedakan Kode Umum dan Kode Lengkap

Jangan kehilangan fungsi kode umum pembelian.

```text
Kode umum kelompok pembelian: 072026-001
Kode lengkap bukti: SPB-03/290-12-072026-001
```

Periksa implementasi API Claude. Jika `kodePembelian` langsung diubah menjadi kode lengkap, pastikan pengelompokan beberapa bukti dalam pembelian yang sama tidak rusak.

Gunakan struktur yang sudah ada apabila memungkinkan. Jika diperlukan pemisahan:

- Simpan kode umum pembelian sebagai identitas kelompok.
- Bangun kode lengkap bukti dari jenis bukti, nomor bukti, dan kode umum.
- Hindari menyimpan satu-satunya sumber pengelompokan sebagai string gabungan yang sulit dicari.

Jangan melakukan refactor besar sebelum membuktikan bahwa struktur sekarang memang tidak mampu memenuhi kebutuhan.

---

# Tahap 4B — Sinkronisasi Barang dan Cashflow

## 4.1 Kelompok Pembelian

Gunakan kode umum pembelian dengan format:

```text
MMYYYY-NNN
```

Contoh:

```text
072026-001
```

Kode tersebut menjadi penghubung logis antara Barang dan seluruh bukti pembayaran dalam kelompok pembelian yang sama.

Urutan pembelian harus:

- Dihitung berdasarkan bulan dan tahun yang dipilih.
- Mengambil nomor berikutnya dari pembelian terakhir pada periode tersebut.
- Tetap dapat diubah secara manual sesuai kebutuhan.
- Konsisten antara form Barang dan form Cashflow.

## 4.2 Kode Bukti Pembayaran

Jenis bukti pembayaran:

- SPB
- Kwitansi
- Nota

Nomor bukti dimasukkan secara manual dan harus menerima karakter yang wajar, termasuk:

```text
- / _
```

Format kode lengkap:

```text
JENIS-NOMORBUKTI-MMYYYY-NNN
```

Contoh:

```text
SPB-03/290-12-072026-001
```

Hindari manipulasi string yang rapuh. Simpan komponen penting dalam field yang sesuai, kemudian bangun kode tampilan melalui fungsi terpusat.

## 4.3 Form Barang

Tambahkan pilihan Cashflow atau kelompok pembelian yang bersifat opsional.

Ketentuan:

- Dropdown menampilkan kode lengkap Cashflow, misalnya `SPB-03/290-12-072026-001`.
- Jika satu kelompok mempunyai beberapa bukti pembayaran, pengguna tetap dapat memahami bahwa bukti-bukti itu berasal dari kelompok pembelian yang sama.
- Nilai yang disimpan sebagai relasi adalah ID yang stabil.
- Barang tetap dapat disimpan tanpa Cashflow karena dokumen pembayaran dapat datang belakangan.
- Field dan generator label yang sudah dikerjakan pada Tahap 1–3 harus tetap bekerja.
- Jangan mengembalikan field label menjadi input manual.

## 4.4 Form Cashflow

Setelah pengguna menentukan:

- Jenis bukti.
- Nomor bukti.
- Tanggal.
- Bulan dan tahun pembelian.
- Urutan pembelian.

Sistem harus menampilkan Barang yang relevan berdasarkan kelompok pembelian tersebut.

Ketentuan:

- Tampilkan Barang yang cocok dengan bulan, tahun, dan urutan pembelian.
- Utamakan Barang terbaru atau Barang yang belum terhubung.
- Pengguna dapat memilih lebih dari satu Barang.
- Hindari duplikasi relasi.
- Sediakan keadaan kosong yang jelas jika belum ada Barang yang cocok.
- Jangan memaksa pengguna membuat Barang baru apabila Barang memang belum datang.

## 4.5 Alur Dua Arah

Kedua skenario berikut wajib berjalan.

### Skenario A — Bukti Pembayaran Datang Lebih Dahulu

1. Pengguna membuat Cashflow dan bukti pembayaran.
2. Sistem menyimpan kelompok pembelian.
3. Barang belum harus tersedia.
4. Saat Barang dibuat kemudian, pengguna dapat memilih Cashflow atau kelompok yang sudah tersedia.
5. Barang terhubung tanpa membuat bukti pembayaran baru.

### Skenario B — Barang Datang Lebih Dahulu

1. Pengguna membuat Barang.
2. Sistem menyimpan kode kelompok pembelian.
3. Cashflow belum harus tersedia.
4. Saat Cashflow dibuat kemudian, sistem menemukan Barang yang memiliki bulan, tahun, dan urutan pembelian yang sama.
5. Pengguna dapat menautkan Barang tersebut kepada kelompok pembelian.

## 4.6 Penghapusan dan Integritas Data

- Menghapus bukti pembayaran tidak boleh menghapus Barang.
- Jangan menggunakan cascade delete dari Pengeluaran ke Barang.
- Jika bukti dihapus, hubungan kelompok pembelian dan Barang tetap harus aman.
- Pertimbangkan apakah bukti sebaiknya diarsipkan atau dihapus tanpa menghapus kelompok pembelian.
- Jika proyek menggunakan audit log atau soft delete, ikuti pola tersebut.
- Data lama yang belum memiliki relasi harus tetap dapat dibaca.
- Migrasi tidak boleh merusak record Barang atau Pengeluaran yang sudah ada.

## 4.7 Preview Bukti Pembayaran

- Bukti pembayaran harus dapat dilihat di dalam aplikasi.
- Jangan hanya menyediakan tombol download.
- Preview harus responsif.
- Jika terdapat lebih dari satu bukti, tampilkan secara horizontal.
- Berikan scrollbar pada bagian bawah.
- Pertahankan aspek rasio dokumen atau gambar.
- Sediakan fallback jika format tidak dapat dipreview.
- Jangan merusak fungsi upload dan download yang sudah ada.

---

# Tahap 5 — Import, Validasi, QR, dan Recently Deleted

## 5.1 Panduan Import

Tambahkan tombol `Panduan` di atas atau di dekat fitur pemilihan file Excel/CSV.

Panduan harus menjelaskan:

- Kolom yang wajib.
- Kolom yang opsional.
- Format tanggal.
- Format harga.
- Aturan label.
- Aturan Nama Barang, Kategori, Ruangan, dan Progdi.
- Contoh satu atau beberapa baris data yang valid.
- Kesalahan umum dan cara memperbaikinya.

Gunakan komponen dialog, modal, atau panel yang sudah tersedia dalam proyek. Jangan membuat sistem UI baru jika komponen yang sesuai sudah ada.

## 5.2 Aturan Validasi

Terapkan validasi secara konsisten pada form manual, API, dan import.

### Nama Barang

- Menerima huruf.
- Menerima angka.
- Menerima simbol yang wajar.

### Kategori

- Hanya menerima huruf.
- Spasi dapat diterima untuk kategori yang terdiri dari beberapa kata.
- Jangan menerima angka atau simbol yang tidak dibutuhkan.

### Label sampai Type

- Gunakan fleksibilitas karakter seperti Nama Barang jika dokumen revisi tidak memberikan batas yang lebih sempit.

### Ruangan

- Wajib memiliki sedikitnya satu digit angka.
- Pada import, teks ruangan boleh dinormalisasi menjadi angka.

Contoh:

```text
R. Pak Budhi 103
```

Hasil normalisasi:

```text
103
```

Lantai ditentukan dari digit pertama nomor ruangan:

```text
103 → lantai 1
203 → lantai 2
```

Tangani nomor ruangan secara hati-hati. Jangan mengubah nilai tanpa memberi hasil validasi atau preview yang dapat dipahami pengguna.

### Tanggal

Format tampilan dan input yang diminta:

```text
dd/mm/yyyy
```

Konversikan dengan aman ke format penyimpanan database.

### Harga

- Menerima angka.
- Dapat menerima format mata uang pada proses import.
- Normalisasi sebelum disimpan.
- Tolak nilai yang tidak dapat ditafsirkan sebagai harga.

### Penentuan Tahun pada Import

Tahun dapat diperoleh dari:

1. Nama file.
2. Kolom tanggal.
3. Bagian `MMYYYY` pada label.

Tetapkan prioritas sumber secara jelas dan tampilkan konflik jika sumber-sumber tersebut menghasilkan tahun yang berbeda. Jangan memilih secara diam-diam apabila datanya ambigu.

## 5.3 Kalibrasi Import dan QR

- Sesuaikan mapping import dengan field baru.
- Pastikan import lama yang masih valid tetap dapat diproses.
- Laporkan baris yang gagal beserta alasannya.
- Jangan membuat data parsial yang sulit dilacak.
- Pastikan scan QR masih menemukan Barang yang aktif.
- Pastikan QR tidak membuat Barang duplikat.

## 5.4 Recently Deleted

Barang yang dihapus harus masuk ke `Recently Deleted` selama lima hari.

Ketentuan:

- Barang belum dihapus permanen selama masa lima hari.
- Tampilkan batas waktu sebelum penghapusan permanen.
- Pengguna yang berwenang dapat memulihkan Barang.
- Setelah lima hari, data dapat dihapus permanen sesuai mekanisme proyek.
- QR lama tetap terhubung dengan identitas Barang.
- Jika QR Barang yang terhapus dipindai dalam masa pemulihan, sistem menawarkan pemulihan.
- Barang yang dipulihkan menggunakan QR yang sama.
- Jangan membuat record baru dengan QR berbeda jika record lama masih dapat dipulihkan.
- Pastikan penghapusan permanen tidak merusak log, Cashflow, atau data historis yang wajib dipertahankan.

---

# Tahap 6 — Tabel, Sort by Cashflow, dan Kalibrasi Peran

## 6.1 Tabel Daftar Barang

Pertahankan kolom utama yang diminta:

1. Nama Barang dan badge status.
2. Kategori.
3. Label.
4. Label Aset.
5. Action.

Jangan menambahkan kolom Status terpisah.

Jangan menambahkan kolom Cashflow ke tabel utama hanya karena diperlukan fitur pengurutan. Implementasikan `Sort by Cashflow` melalui kontrol sort atau filter yang sesuai dengan UI saat ini.

Sort harus memiliki perilaku yang jelas, misalnya:

- Barang yang sudah terhubung Cashflow.
- Barang yang belum terhubung Cashflow.
- Kode kelompok pembelian.
- Waktu Cashflow terbaru atau terlama jika memang tersedia.

Sesuaikan opsi akhir dengan data aktual tanpa mengubah susunan kolom yang telah ditentukan.

## 6.2 Admin

Periksa seluruh flow Admin:

- Menambah dan mengedit Barang.
- Menghapus dan memulihkan Barang.
- Import.
- Scan QR.
- Cashflow.
- Preview bukti.
- Pengaitan Barang dengan kelompok pembelian.
- Statistik dan kartu monitoring.
- Tombol aksi.

Perbaiki inkonsistensi yang berasal dari perubahan field atau relasi, tetapi jangan mendesain ulang halaman tanpa kebutuhan.

## 6.3 Teknisi

Periksa:

- Akses terhadap data Barang.
- Scan QR.
- Status Barang.
- Pelaporan atau pembaruan kerusakan.
- Tombol dan navigasi yang berkaitan.

Jangan membuka akses Cashflow kepada Teknisi apabila role tersebut sebelumnya memang tidak memiliki izin.

## 6.4 Universitas

Dashboard Universitas harus memprioritaskan Barang rusak.

Jika datanya tersedia, tampilkan:

- Nama Barang.
- Status atau tingkat kerusakan.
- Deskripsi kerusakan.
- Biaya yang berkaitan.
- Informasi lokasi atau Progdi yang relevan.

Pertahankan pembatasan akses dan jangan menampilkan data sensitif yang tidak diperlukan oleh role Universitas.

---

# Strategi Migrasi

- Periksa folder migrasi dan script pada `package.json`.
- Ikuti mekanisme migrasi yang sudah digunakan proyek.
- Jangan otomatis menjalankan `prisma db push` pada database yang berisi data tanpa memeriksa dampaknya.
- Utamakan migrasi yang dapat ditinjau dan dilacak.
- Tambahkan field atau relasi baru secara nullable terlebih dahulu apabila diperlukan untuk kompatibilitas data lama.
- Jangan membuat migration reset.
- Jangan menghapus kolom lama sebelum seluruh pembacaan dan penulisan data sudah dipindahkan dengan aman.
- Jalankan `prisma generate` setelah schema valid.

Jika migrasi berpotensi menghilangkan data, berhenti dan jelaskan risikonya sebelum menjalankannya.

---

# Urutan Pengerjaan

Gunakan urutan berikut:

1. Audit branch, commit, working tree, schema, dan hasil Tahap 1–3.
2. Baca seluruh diff parsial Tahap 4 yang ditinggalkan Claude.
3. Perbaiki nesting JSX `LaporanManager.tsx` secara surgis.
4. Jalankan formatter dan typecheck sampai struktur JSX serta type kembali valid.
5. Verifikasi field `jenisBukti`, `nomorBukti`, kode pembayaran, API, dan preview multi-bukti yang sudah mulai dibuat Claude.
6. Jalankan build untuk memastikan baseline bersih kembali.
7. Bandingkan implementasi yang sudah diselamatkan dengan setiap kebutuhan pada `Revisi FTI-APP.md`.
8. Tentukan sumber kebenaran kelompok pembelian tanpa menduplikasi struktur yang sudah ada.
9. Selesaikan schema, migrasi, dan API sinkronisasi yang masih diperlukan.
10. Selesaikan sinkronisasi form Barang dan Cashflow.
11. Uji alur bukti-dahulu dan barang-dahulu.
12. Implementasikan Panduan import dan validasi.
13. Kalibrasi import dan QR.
14. Implementasikan Recently Deleted selama lima hari.
15. Implementasikan Sort by Cashflow.
16. Kalibrasi halaman Admin, Teknisi, dan Universitas.
17. Jalankan seluruh pemeriksaan kualitas.
18. Berikan laporan akhir berdasarkan perubahan nyata.

Jangan mengerjakan seluruh bagian dalam satu perubahan besar. Selesaikan dan verifikasi satu kelompok perubahan sebelum beralih ke bagian berikutnya.

---

# Verifikasi Wajib

Periksa script yang tersedia pada `package.json`, kemudian jalankan yang relevan:

```bash
lint
test
typecheck
build
```

Untuk Prisma, jalankan pemeriksaan yang sesuai dengan project, misalnya:

```bash
prisma format
prisma validate
prisma generate
```

Nama command harus mengikuti package manager dan script yang benar-benar digunakan repository. Jangan mengasumsikan proyek selalu menggunakan Bun.

Tambahkan atau perbarui test untuk:

1. Generator label Barang.
2. Generator kode bukti pembayaran.
3. Urutan pembelian per bulan dan tahun.
4. Satu kelompok dengan banyak Barang.
5. Satu kelompok dengan banyak bukti pembayaran.
6. Cashflow dibuat sebelum Barang.
7. Barang dibuat sebelum Cashflow.
8. Penghapusan bukti tidak menghapus Barang.
9. Normalisasi Ruangan.
10. Import dengan field baru.
11. Pemulihan Barang melalui Recently Deleted.
12. Pemindaian QR Barang aktif dan Barang terhapus.
13. Hak akses Admin, Teknisi, dan Universitas.

Jika terdapat test gagal yang sudah ada sebelum perubahan, buktikan dengan membandingkan kondisi sebelum dan sesudah. Jangan menyebut kegagalan sebagai masalah lama tanpa verifikasi.

---

# Acceptance Criteria

Pekerjaan baru dianggap selesai jika:

- Tahap 1–3 tetap berfungsi dan tidak ditulis ulang.
- Nama Barang dan Progdi tetap tersimpan serta ditampilkan dengan benar.
- Generator label Barang tetap mengikuti format yang sudah ditentukan.
- Satu kelompok pembelian dapat memiliki banyak Barang.
- Satu kelompok pembelian dapat memiliki banyak SPB, Kwitansi, atau Nota.
- Kode umum `MMYYYY-NNN` konsisten di Barang dan Cashflow.
- Kode lengkap bukti pembayaran tampil dengan benar.
- Barang dapat ditautkan dari form Barang maupun form Cashflow.
- Flow tetap bekerja tanpa bergantung pada data mana yang dibuat lebih dahulu.
- Menghapus bukti pembayaran tidak menghapus Barang.
- Preview satu atau banyak bukti pembayaran berjalan di dalam aplikasi.
- Panduan import tersedia dan sesuai dengan validator aktual.
- Import dan QR tetap berfungsi setelah perubahan field.
- Barang terhapus masuk ke Recently Deleted selama lima hari.
- Barang dapat dipulihkan menggunakan QR yang sama.
- Sort by Cashflow tersedia tanpa merusak susunan kolom tabel.
- Tampilan dan hak akses Admin, Teknisi, dan Universitas tidak mengalami regresi.
- Lint, test, typecheck, dan build berhasil, atau setiap kegagalan dijelaskan dengan bukti yang dapat diverifikasi.

---

# Format Laporan Setelah Setiap Tahap

Berikan laporan dengan format berikut:

```markdown
## Tahap yang Dikerjakan

### Kondisi Awal yang Ditemukan
- ...

### File yang Diubah
- `path/file`

### Implementasi
- ...

### Keputusan Teknis
- ...

### Migrasi atau Dampak Data
- ...

### Verifikasi
- Perintah: `...`
- Hasil: berhasil/gagal

### Risiko atau Pekerjaan Tersisa
- ...
```

Jangan hanya mengatakan “selesai”. Sebutkan perubahan nyata, file yang berubah, hasil pemeriksaan, dan bagian yang masih tersisa.

---

# Instruksi Pertama yang Harus Dilakukan Sekarang

Jangan menambah implementasi baru dan jangan mengubah schema lagi sebelum membaca diff parsial yang sudah dibuat Claude.

Lakukan langkah berikut tanpa mengulang Tahap 1–3:

1. Baca `git status` dan seluruh diff perubahan Tahap 4.
2. Konfirmasi bahwa perubahan lokal tersebut merupakan pekerjaan Claude yang harus diteruskan.
3. Buka struktur JSX aktual di sekitar Modal, preview nota horizontal, dan `Add New Nota Inline`.
4. Perbaiki pasangan tag JSX yang salah tanpa menghapus fitur yang sudah ditambahkan.
5. Jalankan formatter dan `bunx tsc --noEmit`, atau perintah typecheck aktual proyek.
6. Perbaiki error lanjutan sampai typecheck bersih tanpa `any`, `@ts-ignore`, atau mematikan aturan.
7. Jalankan build dan pastikan kembali bersih.
8. Setelah implementasi Cashflow Claude stabil, bandingkan hasilnya dengan `Revisi FTI-APP.md`.
9. Susun urutan kerja berikutnya langsung berdasarkan `Revisi FTI-APP.md` dan temuan kode aktual, tanpa membuat `implementation_plan.md` baru.
10. Lanjutkan implementasi sisa Tahap 4 sampai finishing.

Jangan berhenti hanya untuk menanyakan apakah harus memulai Tahap 1 atau Tahap 4. Titik mulainya sudah jelas: lanjutkan diff parsial Tahap 4 milik Claude, dimulai dari perbaikan nesting JSX yang membuat TypeScript gagal.
