# Laporan Tugas Talenta Unggul

**Rancang Bangun Sistem Manajemen Aset SARPRAS FTI UKSW Berbasis Web dengan QR Code dan Role-Based Access Control**

Abiezer B. A. Gamaliel — 672023096

Program Studi Teknik Informatika, FTI UKSW — 2026

Revisi 19 Oktober 2026. Isi bab diselaraskan dengan [TTU1 versi DOCX](TTU1_Abiezer_Revisi_2026-10-19.docx). Implementasi keamanan yang diperiksa: [`bc5ae72`](https://github.com/ChaserHades/fti-uksw/commit/bc5ae72). Panduan pemasangan dan pemeriksaan manual tersedia di [Verifikasi Perbaikan 03](Verifikasi_Perbaikan_03.md).

## BAB I  PENDAHULUAN

### 1.1 Latar Belakang Masalah

Pengelolaan aset Sarana dan Prasarana Fakultas Teknologi Informasi (SARPRAS FTI) UKSW memerlukan catatan yang menghubungkan barang, ruangan, peminjaman, dan pengeluaran. Data barang saja belum cukup untuk menjawab siapa yang meminjam, di mana barang digunakan, atau bukti pembelian mana yang terkait. Ketika catatan itu berada pada berkas terpisah, petugas perlu mencocokkannya kembali sebelum dapat memberikan informasi yang lengkap.

Kebutuhan informasi juga berbeda untuk setiap pengguna. Admin mengelola data dan akun, Teknisi menangani pekerjaan operasional, sedangkan pihak Universitas melihat data inventaris dan pengeluaran. Pembagian ini perlu diterapkan pada server. Menyembunyikan tombol pada halaman saja belum mencegah pengguna mengirim permintaan langsung ke API.

Sebelum revisi ini, penulis telah melakukan wawancara untuk memahami kebutuhan SARPRAS. Pada saat wawancara, aplikasi masih memiliki bug dan beberapa bagian perlu diperbaiki. Masukan tersebut menjadi bahan peninjauan berikutnya, bukan bukti bahwa sistem sudah siap digunakan tanpa kendala. Aplikasi disusun untuk menghubungkan pendataan aset, ruangan, peminjaman, pengembalian, dan pengeluaran. Akun baru berstatus PENDING sampai memperoleh persetujuan Admin. Admin dan Teknisi menjalankan fungsi operasional sesuai hak akses, sedangkan pengelolaan akun, penghapusan aset, dan perubahan pengeluaran dibatasi kepada Admin.

Data aset dapat dimasukkan melalui formulir atau impor Excel (.xlsx). Berkas impor diperiksa dalam pratinjau sebelum disimpan. QR Code dari sistem dipakai untuk membuka data barang, membantu transaksi, dan memeriksa aset yang pernah dihapus. Pada fitur pemulihan, kode yang tidak ditemukan tidak langsung membuat aset baru. Peminjaman mencatat nama peminjam, petugas, ruangan tujuan, dan tenggat pengembalian. Pengeluaran pembelian maupun pemeliharaan dapat dihubungkan dengan aset melalui kelompok pembelian. Ekspor CSV dan Excel tersedia pada endpoint laporan sesuai hak akses masing-masing.

Aplikasi menggunakan Next.js App Router, React, TypeScript, Prisma ORM, dan PostgreSQL. Login yang tersedia saat revisi ini memakai email dan password, dengan sesi JWT pada cookie HttpOnly. Server membaca role dan status akun terbaru serta memeriksa versi sesi. Gambar QR dan berkas nota masih dapat disimpan sebagai data URL Base64 di basis data. Rencana hosting yang sebelumnya mengacu pada Vercel sedang diarahkan ke Cloudflare, dengan tetap memerlukan pemeriksaan kompatibilitas. Login Google melalui akun mahasiswa atau SSO juga merupakan rencana lanjutan. Kedua rencana tersebut belum dihitung sebagai hasil implementasi dalam revisi ini.

### 1.2 Rumusan Masalah

Berdasarkan masalah yang ditemukan pada proses pengelolaan aset SARPRAS FTI UKSW, rumusan masalah pada penelitian ini adalah sebagai berikut:

1.	Bagaimana merancang dan membangun sistem manajemen aset SARPRAS FTI UKSW berbasis web yang dapat mengelola data aset, peminjaman, pemindahan barang, dan laporan dalam satu sistem?

2.	Bagaimana menerapkan QR Code untuk membantu identifikasi barang dan Role-Based Access Control (RBAC) untuk membatasi fungsi yang dapat digunakan oleh masing-masing pengguna?

3.	Bagaimana hasil pengujian terhadap fungsi utama sistem setelah aplikasi selesai dibangun?

### 1.3 Tujuan Penelitian

Tujuan penelitian ini disusun berdasarkan rumusan masalah yang telah ditentukan, yaitu:

1.	Merancang dan membangun sistem manajemen aset SARPRAS FTI UKSW berbasis web yang dapat digunakan untuk pengelolaan aset secara terintegrasi.

2.	Menerapkan QR Code sebagai identitas barang dan RBAC sebagai pengaturan hak akses pengguna di dalam sistem.

3.	Melakukan pengujian pada fungsi utama sistem untuk melihat apakah alur yang dibuat sudah berjalan sesuai dengan kebutuhan pengguna.

### 1.4 Batasan Masalah

Agar pembahasan tidak melebar ke luar kebutuhan SARPRAS, batasan masalah pada penelitian ini adalah sebagai berikut:

1.	Sistem digunakan untuk kebutuhan pengelolaan aset di lingkungan SARPRAS FTI UKSW.

2.	Pengguna utama sistem terdiri dari Admin, Teknisi, dan pihak Universitas dengan hak akses yang berbeda.

3. Fitur yang dibahas meliputi aset, kategori, ruangan, impor Excel, QR Code, peminjaman dan pengembalian, pemindahan barang, kelompok pembelian, pengeluaran, serta riwayat aktivitas.

4.	QR Code digunakan sebagai identitas aset yang dipindai menggunakan kamera. Penelitian ini tidak membahas pelacakan posisi barang secara otomatis menggunakan GPS, RFID, atau perangkat IoT.

5.	Sistem dikembangkan dalam bentuk aplikasi web dan tidak membahas pengembangan aplikasi mobile native.

6. Pembahasan keuangan dibatasi pada pengeluaran dengan jenis PEMBELIAN_ASET, MAINTENANCE, dan LAINNYA. Menu Cashflow tidak dimaksudkan sebagai sistem akuntansi lengkap atau pencatatan arus kas masuk.

### 1.5 Manfaat Penelitian

Manfaat yang diharapkan dari pembangunan sistem ini adalah sebagai berikut:

1.	Bagi SARPRAS FTI UKSW, sistem membantu pencatatan aset, peminjaman, pemindahan barang, dan pencarian data agar tidak lagi bergantung pada berkas yang terpisah.

2. Bagi FTI dan pihak Universitas, sistem menyediakan data inventaris dan pengeluaran yang dapat dilihat melalui halaman sesuai hak aksesnya.

3.	Bagi penulis, penelitian ini menjadi penerapan langsung dari proses analisis kebutuhan, perancangan basis data, pengembangan aplikasi web, sampai pengujian sistem.

### 1.6 Sistematika Penulisan

Laporan ini disusun dalam lima bab. Bab I membahas latar belakang, rumusan masalah, tujuan, batasan, dan manfaat penelitian. Bab II memuat penelitian terdahulu serta teori yang digunakan. Bab III menjelaskan metode dan rancangan sistem. Bab IV membahas implementasi serta hasil pemeriksaan. Bab V memuat hasil yang dicapai, keterbatasan, dan saran pengembangan.

## BAB II  TINJAUAN PUSTAKA DAN LANDASAN TEORI

### 2.1 Penelitian Terdahulu

Penelitian mengenai pengelolaan aset dengan QR Code sudah pernah dilakukan pada beberapa objek yang berbeda. Matondang dkk. membangun sistem manajemen aset berbasis web untuk lingkungan perguruan tinggi dengan fitur pendataan aset, lokasi, QR Code, mutasi, riwayat aset, dan laporan. QR Code digunakan untuk menghubungkan barang fisik dengan data yang tersimpan di dalam sistem [1].

Penelitian lain dilakukan oleh Sitanggang dkk. melalui aplikasi SpaceLog untuk pengelolaan inventaris dan pelacakan aset. Sistem tersebut memakai QR Code, pembagian lokasi, audit trail, dan Role-Based Access Control. Pengguna dibagi berdasarkan peran agar fungsi yang dapat dilakukan tetap sesuai dengan tanggung jawab masing-masing [2].

Penelitian ini memiliki beberapa bagian yang serupa, terutama pada penggunaan aplikasi web, QR Code, dan pembagian hak akses. Perbedaannya ada pada kebutuhan SARPRAS FTI UKSW. Sistem yang dibangun tidak hanya mencatat aset, tetapi juga menangani peminjaman, pemindahan barang antar ruangan, pengeluaran, persetujuan akun, dan laporan yang dapat diakses oleh pihak Universitas.

### 2.2 Sistem Manajemen Aset

Manajemen aset pada penelitian ini berkaitan dengan pencatatan barang sejak aset masuk, ditempatkan pada ruangan, dipinjam, dipindahkan, sampai riwayatnya dibutuhkan kembali. Data tersebut perlu disimpan dalam satu tempat karena perubahan kondisi atau lokasi barang akan memengaruhi data inventaris yang digunakan oleh SARPRAS.

### 2.3 QR Code

QR Code merupakan kode dua dimensi yang dapat dibaca menggunakan kamera atau perangkat pemindai. QR Code juga memiliki kemampuan koreksi kesalahan pada beberapa tingkat sehingga sebagian data masih dapat dibaca ketika kode mengalami kerusakan tertentu [5]. Pada sistem ini, QR Code digunakan sebagai identitas barang. Hasil pindaian tidak digunakan untuk mengetahui posisi barang secara otomatis, tetapi untuk memanggil data aset yang sesuai dari basis data.

### 2.4 Role-Based Access Control

Role-Based Access Control (RBAC) memberikan izin berdasarkan peran pengguna [3]. Pada aplikasi ini, tiga peran yang digunakan adalah ADMIN, TEKNISI, dan UNIVERSITAS. Hak akses diperiksa kembali pada server ketika permintaan diproses. Karena tugas pengguna dapat berubah, informasi role pada token tidak dijadikan satu-satunya acuan; server mengambil nilai terbaru dari tabel pengguna.

### 2.5 Sistem Informasi Berbasis Web

Sistem berbasis web dipilih karena dapat digunakan melalui browser tanpa pemasangan aplikasi khusus pada setiap perangkat. Teknisi dapat membuka sistem melalui komputer maupun perangkat yang memiliki browser dan kamera, sedangkan pembaruan fungsi dilakukan pada aplikasi yang berada di sisi server.

### 2.6 Teknologi Pengembangan Sistem

Aplikasi dibangun menggunakan Next.js dengan TypeScript. Next.js menyediakan App Router yang digunakan untuk mengatur halaman, komponen, serta proses yang berjalan pada sisi server maupun client [6]. Data aplikasi disimpan menggunakan PostgreSQL, sedangkan Prisma ORM digunakan sebagai penghubung antara kode TypeScript dan basis data. PostgreSQL mendukung relasi, foreign key, dan transaksi [7], sementara Prisma menyediakan akses basis data yang mengikuti tipe data pada model aplikasi [8].

### 2.7 Black-Box Testing

Black-box testing memeriksa fungsi berdasarkan masukan dan keluaran yang diharapkan [4]. Skenario pada aplikasi mencakup login, akses setiap role, aset, QR Code, peminjaman, pengembalian, serta impor dan ekspor. Pemeriksaan melalui antarmuka dilengkapi tes otomatis untuk respons API dan sesi. Tes yang memakai database tiruan dipisahkan dari pemeriksaan dengan PostgreSQL agar batas bukti pengujiannya jelas.

## BAB III  METODE PENELITIAN

### 3.1 Jenis Penelitian

Penelitian ini termasuk penelitian terapan (Applied Research) di bidang Rekayasa Perangkat Lunak (Software Engineering). Penelitian difokuskan pada perancangan, pengembangan, dan pengujian sistem informasi berbasis web untuk menyelesaikan masalah manajemen inventaris aset di FTI UKSW secara spesifik dan praktis.

### 3.2 Metode Pengumpulan Data

Pengumpulan kebutuhan dan pemeriksaan implementasi disusun melalui dua sumber berikut.

1. Studi literatur dan dokumentasi: menelaah referensi QR Code, RBAC, aplikasi web, dan basis data relasional. Dokumentasi Next.js, PostgreSQL, serta Prisma menjadi rujukan teknis selama pengembangan.

2. Wawancara kebutuhan: penulis telah mewawancarai pihak SARPRAS ketika aplikasi masih memiliki bug dan membutuhkan perbaikan. Wawancara membantu meninjau kebutuhan dan alur penggunaan. Catatan wawancara serta masukan yang diperoleh perlu disertakan sebagai bukti kegiatan, terpisah dari hasil pengujian teknis pada versi aplikasi sesudah perbaikan.

### 3.3 Metode Pengembangan Sistem

Pengembangan dilakukan secara bertahap. Masukan dari wawancara dan temuan saat aplikasi diperiksa digunakan untuk menentukan bagian yang perlu diperbaiki. Perubahan dibatasi pada masalah yang sedang dikerjakan agar alur operasional tetap dapat ditinjau. Cara kerja ini mengikuti pendekatan iteratif: kebutuhan diterjemahkan menjadi rancangan, diimplementasikan, diuji, dan diperbaiki kembali. Tahapannya dijelaskan sebagai berikut.

Analisis kebutuhan: menetapkan tiga role pengguna dan hubungan data User, Barang, Kategori, Ruangan, Peminjaman, Pengeluaran, KelompokPembelian, serta LogAktivitas. Nama peminjam dibedakan dari akun petugas yang mencatat transaksi.

Perancangan sistem: menyusun relasi basis data dan halaman kerja untuk inventaris, peminjaman, riwayat, Cashflow, serta Tim & Verifikasi. Antarmuka memakai gaya visual yang sudah digunakan pada aplikasi, dengan tabel, pencarian, formulir, dan dialog konfirmasi.

Implementasi Kode (Implementation):

Frontend dan backend: menggunakan Next.js App Router dengan komponen React. Server menangani pemeriksaan akses dan pembacaan data, sedangkan komponen client menangani interaksi formulir, tabel, serta kamera.

Basis data: menggunakan PostgreSQL melalui Prisma ORM. Transaksi dipakai pada proses yang memperbarui beberapa catatan, misalnya penyimpanan peminjaman bersama perubahan status barang dan log aktivitas.

Autentikasi dan sesi: password disimpan sebagai hash bcrypt. JWT ditandatangani dengan HS256 dan memiliki masa berlaku tujuh hari. Cookie memakai HttpOnly, SameSite=Lax, dan Secure pada lingkungan produksi. HttpOnly membatasi pembacaan cookie oleh JavaScript, tetapi tidak menggantikan perlindungan terhadap seluruh bentuk XSS. Server memeriksa keberadaan akun, role, status verifikasi, kewajiban ganti password, serta sessionVersion sebelum mengizinkan akses.

Penyimpanan berkas: QR Code dan lampiran nota dapat disimpan sebagai data URL Base64. Cara ini menghindari ketergantungan pada berkas lokal server, tetapi menambah ukuran data yang dibaca dari basis data. Pemindahan ke object storage atau penyimpanan server tetap menjadi pertimbangan untuk penggunaan dengan jumlah berkas lebih besar.

Impor dan ekspor: exceljs membaca berkas .xlsx untuk pratinjau impor, sedangkan library xlsx membentuk keluaran CSV atau Excel pada endpoint ekspor. Hasil impor membedakan data baru, diperbarui, dilewati, dan gagal. LogAktivitas mencatat operasi yang memiliki pencatatan log pada implementasinya, terutama perubahan aset, peminjaman, ruangan, kategori, dan pengeluaran.

QR Code: library qrcode membentuk gambar dari identitas aset. Hasil pemindaian digunakan untuk mencari data atau menilai status pemulihan barang. Pembuatan kode, pencetakan, dan pembacaan kamera merupakan bagian yang berbeda dan perlu diperiksa sesuai perangkat yang dipakai.

Pengujian: menjalankan tes otomatis pada penjagaan akses, kerahasiaan respons pengguna, dan pencabutan sesi. Migrasi serta perubahan versi sesi juga diperiksa pada PostgreSQL uji. Pemeriksaan manual dilakukan melalui browser; hasil yang sudah dikonfirmasi dipisahkan dari skenario yang masih menunggu verifikasi.

Perbaikan lanjutan: temuan di luar tahap yang sedang dikerjakan dicatat untuk pemeriksaan berikutnya. Hasil build dipakai untuk memastikan aplikasi dapat dibangun, bukan untuk menyatakan seluruh fungsi bebas kesalahan.

### 3.4 Analisis Sistem Berjalan

Analisis berangkat dari kebutuhan mencocokkan data fisik aset dengan catatan ruangan, peminjaman, dan pengeluaran. Bila catatan tersebut dikelola terpisah, pemindahan atau pengembalian barang memerlukan pembaruan pada lebih dari satu tempat. Aplikasi menyatukan hubungan datanya agar petugas dapat memeriksa status dan riwayat dari halaman yang saling terkait.

Pada sisi pengeluaran, satu pembelian dapat berkaitan dengan beberapa barang dan beberapa bukti pembayaran. Karena itu, hubungan tidak cukup diwakili oleh satu kolom nota pada barang. Model KelompokPembelian digunakan sebagai penghubung, sementara catatan pengeluaran tetap dapat berdiri sendiri ketika belum dikaitkan dengan aset.

### 3.5 Analisis Kebutuhan Sistem

Kebutuhan sistem dibagi menjadi kebutuhan fungsional dan kebutuhan nonfungsional. Kebutuhan fungsional berhubungan langsung dengan proses yang dilakukan pengguna, sedangkan kebutuhan nonfungsional digunakan untuk menentukan batas dari sisi keamanan dan cara sistem digunakan.

1.	Sistem menyediakan autentikasi pengguna dan proses persetujuan akun sebelum akun dapat digunakan.

2. Admin mengelola aset, kategori, ruangan, akun, verifikasi, reset password, dan pengeluaran. Teknisi dapat menambah atau memperbarui aset melalui endpoint yang diizinkan, selain menjalankan proses operasional.

3.	Teknisi dapat mencatat peminjaman, pengembalian, serta pemindahan barang sesuai dengan hak aksesnya.

4. Sistem membuat QR Code dari identitas aset dan membaca kode untuk pencarian atau pemulihan. Pemulihan hanya berlaku bagi aset yang masih memenuhi batas waktu penghapusan.

5. Impor menerima berkas Excel (.xlsx). Ekspor laporan menyediakan CSV dan Excel sesuai pembatasan role pada endpoint.

6. Operasi yang dicakup pencatatan log menyimpan pelaku, waktu, entitas, dan ringkasan tindakan. Akun yang belum disetujui atau wajib mengganti password tidak dapat mengakses API operasional.

### 3.6 Perancangan Sistem

Perancangan sistem dibuat berdasarkan hasil analisis kebutuhan. Bagian yang dirancang meliputi pembagian hak akses pengguna, hubungan antar data, alur QR Code, serta skenario pengujian yang akan digunakan setelah fitur selesai diimplementasikan.

#### 3.6.1 Perancangan Hak Akses

Hak akses mengikuti role dan kondisi akun. Admin mengelola data utama serta akun. Teknisi dapat mencatat dan memperbarui aset, memindahkan ruangan, memulihkan aset dalam batas waktu, serta memproses peminjaman dan pengembalian. Pihak Universitas menggunakan akses baca pada inventaris dan pengeluaran. Ekspor aset dan pengeluaran pada API dibatasi kepada Admin; ekspor peminjaman mengizinkan Admin dan Teknisi. Dengan demikian, akses melihat data tidak otomatis berarti boleh mengubah atau mengekspornya.

#### 3.6.2 Perancangan Basis Data

Basis data terdiri atas delapan model utama: User, Barang, Kategori, Ruangan, Peminjaman, Pengeluaran, KelompokPembelian, dan LogAktivitas. Barang memiliki relasi ke kategori dan ruangan, serta hubungan opsional ke pengeluaran dan kelompok pembelian. Peminjaman menyimpan nama peminjam aktual dan userId petugas pencatat. Pada User, sessionVersion berupa bilangan bulat dengan nilai awal 0. Nilai ini dinaikkan ketika password diganti atau di-reset, tanpa mengubah data aset dan transaksi.

#### 3.6.3 Perancangan Alur QR Code

QR Code digunakan untuk mencari aset berdasarkan identitas yang dibaca. Pada fitur pemulihan, server membedakan lima hasil: ACTIVE untuk aset aktif, RECOVERABLE untuk aset terhapus yang masih dapat dipulihkan, EXPIRED ketika masa pemulihan berakhir, AMBIGUOUS ketika label lama cocok dengan lebih dari satu aset, dan NOT_FOUND ketika tidak ada data yang sesuai. Batas pemulihan adalah enam hari sejak deletedAt. Hasil NOT_FOUND atau AMBIGUOUS tidak membuat barang baru secara otomatis.

#### 3.6.4 Rancangan Pengujian

Skenario pengujian disusun dari fungsi operasional dan aturan akses. Daftar berikut merupakan cakupan pemeriksaan; status pelaksanaannya dijelaskan pada Bab IV.

1.	Login menggunakan akun dengan status yang sesuai dan akun yang masih berstatus PENDING.

2.	Akun Teknisi atau Universitas mencoba membuka fungsi yang hanya tersedia untuk Admin.

3.	QR Code yang valid dipindai dan sistem menampilkan data barang yang sesuai.

4. Barang berstatus DIPINJAM ditolak pada peminjaman berikutnya dalam urutan biasa. Permintaan peminjaman serentak perlu diuji secara terpisah karena pemeriksaan status dilakukan sebelum transaksi penyimpanan.

5. Berkas Excel diperiksa dalam pratinjau sebelum disimpan. Untuk sesi, cookie lama diuji kembali setelah password diganti, setelah reset Admin, dan setelah kewajiban ganti password selesai.

## BAB IV  HASIL IMPLEMENTASI DAN PEMBAHASAN

### 4.1 Hasil Implementasi Sistem

Hasil implementasi berupa aplikasi manajemen aset SARPRAS FTI UKSW berbasis web. Menu Admin mencakup Dashboard, Manajemen Aset, serta Tim & Verifikasi. Pada Manajemen Aset tersedia bagian Aset, Peminjaman, Riwayat, dan Cashflow. Aplikasi dibangun dengan Next.js dan TypeScript, menggunakan Prisma ORM serta PostgreSQL. Revisi laporan ini mengikuti kode perbaikan sesi bc5ae72, yang melanjutkan pembatasan respons pengguna dan pemeriksaan kondisi akun pada revisi sebelumnya.

### 4.2 Implementasi Pengelolaan Aset

Data aset mencakup identitas barang, kategori, ruangan, kondisi, status, jumlah, serta informasi pembelian yang tersedia. Admin dan Teknisi dapat menambah atau memperbarui aset sesuai endpoint yang digunakan. Penghapusan oleh Admin mula-mula mengisi deletedAt sehingga barang masuk daftar terhapus. Aset tersebut dikecualikan dari peminjaman baru dan beberapa pemilihan data operasional. Pemulihan tersedia dalam waktu enam hari; penghapusan permanen tetap memeriksa hubungan dengan riwayat peminjaman. Impor .xlsx menyediakan pratinjau dan ringkasan hasil penyimpanan.

### 4.3 Implementasi QR Code

QR Code yang dibuat sistem dapat dicetak untuk identifikasi barang. Pemindaian menghubungkan kode dengan data di basis data dan menampilkan hasil yang sesuai. Fitur pemulihan menggunakan lima status yang dijelaskan pada Bab III. Label lama yang dipakai lebih dari satu aset menghasilkan AMBIGUOUS, sehingga sistem tidak memilih satu barang secara acak. Kamera memerlukan dukungan browser dan izin pengguna; pengujian pada satu perangkat belum membuktikan kompatibilitas semua perangkat.

### 4.4 Implementasi Role-Based Access Control

Pemeriksaan akses dilakukan pada halaman dan API. Server memverifikasi tanda tangan serta masa berlaku JWT, lalu membaca akun dari basis data. Role, status verifikasi, dan mustChangePassword menggunakan nilai terbaru. Permintaan tanpa sesi yang sah mendapat HTTP 401, sedangkan akun yang belum disetujui, wajib mengganti password, atau tidak memiliki role yang diperlukan mendapat HTTP 403 pada API operasional. Respons yang membawa profil pengguna memilih field yang diperlukan; hash password tidak ikut dikirim.

Pencabutan sesi memakai sessionVersion pada akun dan JWT. Reset Admin menyimpan hash password sementara, mengaktifkan mustChangePassword, dan menaikkan versi dalam satu pembaruan. Sesi sebelumnya kemudian ditolak. Setelah pengguna login memakai password sementara dan berhasil menggantinya, versi dinaikkan lagi dan browser itu mendapat cookie baru. Pembaruan password juga mensyaratkan versi yang sama dengan sesi yang diperiksa, sehingga reset yang terjadi di tengah proses tidak dapat ditimpa oleh sesi lama. Logout biasa tetap menghapus cookie pada browser yang digunakan.

### 4.5 Implementasi Peminjaman dan Pengembalian

Peminjaman menyimpan barang, nama peminjam, ruangan tujuan, petugas pencatat, dan deadlineKembali. Transaksi baru memakai status AKTIF dan mengubah status barang menjadi DIPINJAM. Pengembalian mengisi tanggalKembali dan mengubah transaksi menjadi SELESAI. Barang aktif kembali menjadi TERSEDIA; barang yang telah dihapus tetap diperlakukan sebagai barang terhapus. Penanda terlambat disimpan pada riwayat. Pemeriksaan status yang ada menangani peminjaman berurutan, tetapi belum menjadi bukti pencegahan dua permintaan pinjam yang datang bersamaan.

### 4.6 Implementasi Pengeluaran dan Laporan

Cashflow mencatat pengeluaran dengan jenis PEMBELIAN_ASET, MAINTENANCE, atau LAINNYA. Jenis bukti pembayaran, seperti SPB, kwitansi, dan nota, disimpan terpisah dari jenis pengeluaran. KelompokPembelian menghubungkan beberapa aset dan catatan pengeluaran dalam kelompok yang sama. Lampiran nota disimpan sebagai data URL pada implementasi saat ini. Ekspor pengeluaran tersedia dalam CSV atau Excel bagi Admin, sedangkan pihak Universitas dapat membaca data melalui halaman yang disediakan.

### 4.7 Hasil Pengujian

Pada revisi 19 Oktober 2026, perintah node --test tests/*.test.mjs menjalankan 60 tes dan seluruhnya lulus. Sebanyak 13 tes memeriksa pembatasan profil pengguna pada respons dan ekspor; 47 tes lainnya mencakup sesi, akses, perubahan password, dan reset. Modul aplikasi yang sebenarnya dijalankan dengan batas database dan cookie tiruan pada tes tersebut. Verifikasi JWT dan hashing tetap memakai library yang digunakan aplikasi. Hasil ini dilengkapi pemeriksaan PostgreSQL serta permintaan HTTP ke aplikasi yang dibangun.

Tabel 4.1. Cakupan dan hasil verifikasi revisi 19 Oktober 2026

| Pemeriksaan | Lingkungan/bukti | Hasil |
| --- | --- | --- |
| Profil pengguna | 13 tes modul API dan ekspor; database tiruan | Lulus; field profil terpilih, tanpa hash password. |
| Sesi dan akses | 47 tes; JWT/bcrypt nyata, cookie dan database tiruan | Lulus; termasuk token lama, role, reset, dan perubahan bersamaan. |
| Migrasi akun | PostgreSQL uji; akun dibuat sebelum migrasi baru | Lulus; data dan hash tetap, sessionVersion menjadi 0. |
| Pembaruan bersamaan | Prisma dan PostgreSQL uji | Versi bertambah atomik; hanya satu perubahan dengan versi awal yang sama berhasil. |
| HTTP aplikasi | Next.js hasil build dan PostgreSQL uji | Sesi valid 200; sesi lama setelah reset 401; sesi wajib ganti password 403. |
| Build dan tipe | npm run build; pemeriksaan TypeScript terarah | Build lulus. Tidak ada diagnostik pada tiga berkas autentikasi; pemeriksaan tipe seluruh proyek belum dinyatakan lulus. |
| Akses Admin | Pemeriksaan manual oleh pengembang pada localhost | Halaman Dashboard, Peminjaman, Riwayat, Cashflow, dan Tim & Verifikasi dapat digunakan. |
| Uji lanjutan | Browser lokal setelah pemasangan revisi, perangkat kamera, dan pengguna SARPRAS | Pencabutan sesi lintas browser serta penerimaan pengguna belum dicatat sebagai lulus manual. |

Pemeriksaan manual pada komputer pengembang telah mengonfirmasi akses normal Admin ke Dashboard, Peminjaman, Riwayat, Cashflow, serta Tim & Verifikasi. Respons profil dan daftar pengguna yang diperiksa tidak memuat hash password. Wawancara SARPRAS yang telah dilakukan berlangsung pada versi aplikasi yang masih memiliki bug; kegiatan tersebut tidak digunakan untuk menyatakan bahwa revisi keamanan terbaru telah diterima pengguna. Pemeriksaan pencabutan sesi pada beberapa browser perlu dilakukan setelah migrasi dipasang pada database lokal. Pengujian kamera lintas perangkat, beban, dan penerimaan versi terbaru juga perlu dicatat tersendiri.

### 4.8 Pembahasan

Hubungan antara barang, transaksi, ruangan, dan pengeluaran membuat informasi dapat dibaca dari satu aplikasi. Perbaikan keamanan memperjelas batas akses: perubahan role mengikuti data terbaru, profil yang dikirim ke browser tidak membawa hash password, dan reset password membatalkan sesi lama. Pada kasus reset, penanda wajib ganti password saja tidak cukup. Tanpa versi sesi, token lama berpotensi dapat digunakan lagi ketika penanda tersebut sudah dinonaktifkan.

Implementasi tersebut belum membuktikan kesiapan pada semua kondisi penggunaan. Pengujian keamanan sesi memiliki cakupan yang jelas, sedangkan alur lain masih memerlukan pemeriksaan tersendiri. Penyimpanan Base64, konsistensi perhitungan keterlambatan, dan peminjaman serentak tetap perlu ditinjau. Rencana Cloudflare serta login Google/SSO belum diterapkan pada versi yang diuji. Efisiensi kerja petugas juga belum dapat dinyatakan dalam angka tanpa pengukuran sebelum dan sesudah penggunaan sistem.

## BAB V  PENUTUP

### 5.1 Hasil yang Dicapai

Pengembangan pada revisi ini menghasilkan tiga hal berikut.

1. Aplikasi menghubungkan aset, ruangan, peminjaman, pemindahan barang, pengeluaran, kelompok pembelian, dan riwayat aktivitas. QR Code membantu mencari identitas aset, termasuk pada proses pemulihan barang terhapus.

2. Hak akses diterapkan berdasarkan role dan kondisi akun terbaru. Pembatasan field respons menjaga hash password tetap di sisi server, sedangkan sessionVersion mencabut sesi yang diterbitkan sebelum perubahan atau reset password.

3. Seluruh 60 tes otomatis lulus, disertai pemeriksaan migrasi dan perubahan versi sesi pada PostgreSQL uji. Akses normal Admin telah diperiksa secara manual. Hasil tersebut berlaku pada skenario yang diuji dan belum mencakup penerimaan pengguna atau seluruh beban operasional.

### 5.2 Keterbatasan

Keterbatasan saat ini meliputi penyimpanan lampiran sebagai Base64, belum lengkapnya pengujian kamera dan beban, serta risiko peminjaman serentak yang perlu diperiksa lebih lanjut. Build masih memakai konfigurasi ignoreBuildErrors, sehingga build yang berhasil tidak berarti semua berkas proyek telah lolos TypeScript. Pemeriksaan TypeScript terarah pada tiga berkas autentikasi yang diubah tidak menemukan diagnostik. Pemasangan sessionVersion membutuhkan migrasi database dan membuat sesi dari versi aplikasi sebelumnya tidak berlaku; pengguna perlu login ulang.

### 5.3 Saran

Pengembangan berikutnya perlu mempertimbangkan kebutuhan penggunaan nyata dan temuan pengujian yang belum selesai.

1. Menuntaskan pemeriksaan peminjaman serentak, konsistensi batas keterlambatan, dan validasi masukan. Sesudah itu, lakukan pengujian penerimaan dengan pengguna SARPRAS dan simpan bukti setiap skenario.

2. Memeriksa kelayakan Cloudflare untuk menjalankan aplikasi Next.js, mengakses PostgreSQL, dan menangani berkas yang digunakan sistem. Login Google melalui akun mahasiswa atau SSO perlu dirancang dengan verifikasi identitas dan kebijakan akun institusi, sambil mempertahankan persetujuan Admin serta pembagian role. Setelah lingkungan tujuan siap, lakukan pengujian integrasi, cadangan basis data, dan beban sebelum publikasi.

## DAFTAR PUSTAKA

[1] A. Matondang, D. N. D. Sari, M. E. Zuwanda, H. Y. Tumanggor, N. L. Siregar, dan R. N. Simanjuntak, “Rancang Bangun Sistem Informasi Manajemen Aset Berbasis Web Menggunakan QR Code Untuk Meningkatkan Efisiensi Inventarisasi AMIK Universal,” Jutisal Jurnal Teknik Informatika Universal, vol. 3, no. 2, 2023.

[2] J. A. Sitanggang, B. H. Saputra, A. Hidayati, dan H. Saragih, “Design and development of the spacelog web application for inventory management and asset tracking using QR codes at the Cyber Defense Center of the Ministry of Defense,” Jurnal Mandiri IT, vol. 14, no. 3, pp. 283–293, 2026, doi: 10.35335/mandiri.v14i3.481.

[3] R. S. Sandhu, E. J. Coyne, H. L. Feinstein, dan C. E. Youman, “Role-Based Access Control Models,” Computer, vol. 29, no. 2, pp. 38–47, 1996, doi: 10.1109/2.485845.

[4] I. Sommerville, Software Engineering, 10th ed. Pearson, 2015.

[5] DENSO WAVE, “QR Code Error Correction Feature.” [Online]. Available: https://www.qrcode.com/en/about/error_correction.html

[6] Vercel, “Next.js Documentation - App Router.” [Online]. Available: https://nextjs.org/docs/app

[7] PostgreSQL Global Development Group, “PostgreSQL Documentation.” [Online]. Available: https://www.postgresql.org/docs/

[8] Prisma Data, Inc., “Prisma ORM Documentation.” [Online]. Available: https://www.prisma.io/docs/orm
