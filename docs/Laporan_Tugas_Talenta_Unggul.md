# Laporan Tugas Talenta Unggul

**Rancang Bangun Sistem Manajemen Aset SARPRAS FTI UKSW Berbasis Web dengan QR Code dan Role-Based Access Control**

Abiezer B. A. Gamaliel — 672023096

Program Studi Teknik Informatika, FTI UKSW — 2026

Revisi bimbingan 20 Oktober 2026. Isi bab diselaraskan dengan [TTU1 versi DOCX](TTU1_Abiezer_Google_Docs_Final.docx) dan [PDF untuk dibaca](TTU1_Abiezer_Google_Docs_Final.pdf). Catatan lingkup perubahan tersedia di [Catatan Revisi TTU1](Catatan_Revisi_TTU1_2026-10-20.md). Bukti teknis serta langkah pemeriksaan manual tercatat pada [Verifikasi Perbaikan 03](Verifikasi_Perbaikan_03.md).

## BAB I PENDAHULUAN

### 1.1 Latar Belakang Masalah

Pengelolaan aset Sarana dan Prasarana Fakultas Teknologi Informasi (SARPRAS FTI) UKSW memerlukan catatan yang menghubungkan barang, ruangan, peminjaman, dan pengeluaran. Data barang saja belum cukup untuk menjawab siapa yang meminjam, di mana barang digunakan, atau bukti pembelian mana yang terkait. Ketika catatan itu berada pada berkas terpisah, petugas perlu mencocokkannya kembali sebelum dapat memberikan informasi yang lengkap.

Kebutuhan informasi juga berbeda untuk setiap pengguna. Admin mengelola data dan akun, Teknisi menangani pekerjaan operasional, sedangkan pihak Universitas melihat data inventaris dan pengeluaran. Pembagian ini perlu diterapkan pada server. Menyembunyikan tombol pada halaman saja belum mencegah pengguna mengirim permintaan langsung ke API.

Penulis telah melakukan wawancara dengan pihak SARPRAS ketika aplikasi masih memiliki bug dan membutuhkan perbaikan. Kegiatan tersebut menjadi bagian dari pengumpulan kebutuhan selama pengembangan. Setelah wawancara, penulis melanjutkan peninjauan implementasi dan pengujian aplikasi. Laporan ini membedakan hasil pengembangan tersebut dari penerimaan sistem oleh pengguna SARPRAS, yang belum dinyatakan selesai.

Aplikasi yang dikembangkan menghubungkan pendataan aset, kategori, ruangan, peminjaman, pengembalian, dan pengeluaran. Formulir serta impor Excel (.xlsx) digunakan untuk memasukkan data aset. QR Code membantu petugas menemukan barang yang sesuai sebelum melakukan tindakan. Peminjaman mencatat nama peminjam, petugas, ruangan tujuan, dan tenggat pengembalian; kelompok pembelian menghubungkan aset dengan catatan pengeluaran. Pembagian akses disertai persetujuan akun baru oleh Admin sebelum akun dapat digunakan.

Pengembangan menggunakan Next.js, React, TypeScript, Prisma ORM, dan PostgreSQL. Pada versi yang dibahas, pengguna login dengan email dan password. Pemeriksaan sesi mencakup kondisi akun terbaru serta pencabutan sesi setelah reset atau penggantian password. Hosting Cloudflare dan login Google melalui akun mahasiswa atau SSO masih menjadi rencana pengembangan. Penilaian pada laporan ini didasarkan pada implementasi dan hasil pengujian yang telah tersedia, bukan pada fitur yang masih direncanakan.

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

## BAB II TINJAUAN PUSTAKA DAN LANDASAN TEORI

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

## BAB III METODE PENELITIAN

### 3.1 Jenis Penelitian

Penelitian ini termasuk penelitian terapan (Applied Research) di bidang Rekayasa Perangkat Lunak (Software Engineering). Penelitian difokuskan pada perancangan, pengembangan, dan pengujian sistem informasi berbasis web untuk menyelesaikan masalah manajemen inventaris aset di FTI UKSW secara spesifik dan praktis.

### 3.2 Metode Pengumpulan Data

Pengumpulan kebutuhan dilakukan melalui wawancara dengan pihak SARPRAS dan studi literatur. Untuk menilai kesesuaian laporan dengan aplikasi, penulis juga menelaah struktur basis data, pembatasan akses, serta hasil pengujian pada versi yang dibahas.

Studi literatur mencakup pengelolaan aset, QR Code, RBAC, dan pengujian perangkat lunak. Dokumentasi Next.js, PostgreSQL, dan Prisma digunakan sebagai rujukan implementasi. Sumber tersebut membantu menjelaskan pilihan teknologi dan cara kerjanya, sedangkan kebutuhan penggunaan tetap mengacu pada konteks SARPRAS.

Wawancara berlangsung ketika aplikasi masih dalam tahap perbaikan. Karena itu, informasi dari kegiatan tersebut digunakan untuk memahami kebutuhan dan meninjau alur penggunaan pada tahap pengembangan. Hasil wawancara tidak diperlakukan sebagai persetujuan terhadap versi aplikasi setelah perbaikan. Pemeriksaan teknis dan pengujian penerimaan pengguna merupakan kegiatan terpisah.

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

### 3.4 Analisis Proses dan Kebutuhan Operasional

Proses yang menjadi perhatian penelitian meliputi pendataan barang, penempatan ruangan, peminjaman, pengembalian, dan pencatatan pengeluaran. Setiap proses memerlukan hubungan data yang jelas. Misalnya, catatan peminjaman perlu menunjukkan barang yang digunakan, nama peminjam, petugas pencatat, serta waktu pengembalian. Informasi tersebut menjadi dasar penyusunan alur aplikasi. Pembahasan ini tidak menetapkan besarnya kesalahan atau waktu kerja pada proses sebelumnya karena pengukuran tersebut belum tersedia.

Perubahan ruangan dan peminjaman diperlakukan sebagai dua kegiatan berbeda. Pemindahan memperbarui ruangan pada data aset, sedangkan peminjaman menyimpan ruangan tujuan penggunaan pada catatan transaksi. Pada sisi pengeluaran, satu kelompok pembelian dapat menghubungkan beberapa aset dan bukti pembayaran. Catatan pengeluaran juga dapat disimpan tanpa hubungan ke barang, misalnya ketika belum ada aset yang dikaitkan. Hubungan ini dituangkan ke rancangan basis data pada Bagian 3.6.2.

### 3.5 Analisis Kebutuhan Sistem

Kebutuhan fungsional menjelaskan tindakan yang harus disediakan bagi pengguna. Kebutuhan nonfungsional berkaitan dengan pembatasan akses, keterjagaan data, dan kondisi penggunaan aplikasi. Kebutuhan fungsional yang menjadi cakupan pengembangan adalah sebagai berikut.

1.	Sistem menyediakan autentikasi pengguna dan proses persetujuan akun sebelum akun dapat digunakan.

2. Admin mengelola aset, kategori, ruangan, akun, verifikasi, reset password, dan pengeluaran. Teknisi dapat menambah atau memperbarui aset melalui endpoint yang diizinkan, selain menjalankan proses operasional.

3.	Teknisi dapat mencatat peminjaman, pengembalian, serta pemindahan barang sesuai dengan hak aksesnya.

4. Sistem membuat QR Code dari identitas aset dan membaca kode untuk pencarian atau pemulihan. Pemulihan hanya berlaku bagi aset yang masih memenuhi batas waktu penghapusan.

5. Impor menerima berkas Excel (.xlsx). Ekspor laporan menyediakan CSV dan Excel sesuai pembatasan role pada endpoint.

6. Sistem mencatat pengeluaran dan hubungan kelompok pembelian. Pada operasi yang memiliki pencatatan log, sistem menyimpan pelaku, waktu, entitas, dan ringkasan tindakan.

Kebutuhan nonfungsional meliputi pemeriksaan akses pada server, penyimpanan password dalam bentuk hash, pembatasan field profil pada respons, dan pencabutan sesi setelah perubahan password. Aplikasi ditujukan untuk penggunaan melalui browser, dengan izin kamera apabila pemindaian digunakan. Relasi dan transaksi basis data mendukung keterjagaan hubungan catatan. Target waktu respons, jumlah pengguna serentak, serta tingkat ketersediaan layanan belum ditetapkan sebagai hasil terukur pada penelitian ini.

### 3.6 Perancangan Sistem

Perancangan sistem dibuat berdasarkan hasil analisis kebutuhan. Bagian yang dirancang meliputi pembagian hak akses pengguna, hubungan antar data, alur QR Code, serta skenario pengujian yang akan digunakan setelah fitur selesai diimplementasikan.

#### 3.6.1 Perancangan Hak Akses

Hak akses mengikuti role dan kondisi akun. Admin mengelola data utama serta akun. Teknisi dapat mencatat dan memperbarui aset, memindahkan ruangan, memulihkan aset dalam batas waktu, serta memproses peminjaman dan pengembalian. Pihak Universitas menggunakan akses baca pada inventaris dan pengeluaran. Ekspor aset dan pengeluaran pada API dibatasi kepada Admin; ekspor peminjaman mengizinkan Admin dan Teknisi. Dengan demikian, akses melihat data tidak otomatis berarti boleh mengubah atau mengekspornya.

#### 3.6.2 Perancangan Basis Data

Basis data terdiri atas delapan model utama: User, Barang, Kategori, Ruangan, Peminjaman, Pengeluaran, KelompokPembelian, dan LogAktivitas. Setiap barang terhubung ke satu kategori dan dapat ditempatkan pada satu ruangan. Satu barang dapat memiliki banyak riwayat peminjaman dari waktu yang berbeda. Pada setiap peminjaman, userId menunjuk akun petugas pencatat, sedangkan namaPeminjam menyimpan nama peminjam aktual. Dengan rancangan ini, peminjam tidak harus mempunyai akun aplikasi.

Kategori dan Ruangan masing-masing dapat berkaitan dengan banyak barang. Satu KelompokPembelian dapat menghubungkan banyak Barang dan banyak Pengeluaran, sedangkan setiap catatan tersebut memiliki paling banyak satu kelompok pembelian. Hubungan langsung Pengeluaran ke Barang juga masih tersedia pada model. User terhubung ke peminjaman, pengeluaran, dan log aktivitas sebagai pencatat tindakan. LogAktivitas menyimpan nama entitas serta ID entitas yang dicatat, tanpa foreign key ke setiap jenis entitas.

Pada User, sessionVersion disimpan sebagai bilangan bulat dengan nilai awal 0. Login menyalin versi tersebut ke JWT. Ketika password di-reset atau diganti, versi pada akun dinaikkan. Permintaan berikutnya membandingkan versi token dengan versi akun; perbedaan nilai menyebabkan sesi ditolak. Mekanisme ini tidak mengubah hubungan data aset dan transaksi.

#### 3.6.3 Perancangan Alur QR Code

QR Code yang dihasilkan sistem memuat ID internal barang dan kode label dalam format JSON. Pembaca mendahulukan ID untuk menemukan barang; format kode lama tetap dapat dibaca melalui nilai kode atau teks biasa. Hasil pindaian digunakan sebagai masukan pencarian. Tindakan berikutnya bergantung pada halaman yang digunakan, misalnya membuka formulir peminjaman atau memeriksa kemungkinan pemulihan barang terhapus.

Pada alur pemulihan, server mencari ID internal terlebih dahulu, kemudian mencoba label lama. Hasilnya adalah ACTIVE untuk aset aktif, RECOVERABLE untuk aset terhapus yang masih dalam masa pemulihan, EXPIRED setelah masa tersebut berakhir, AMBIGUOUS untuk label yang cocok dengan lebih dari satu barang, atau NOT_FOUND apabila tidak ada kecocokan. Batas pemulihan adalah enam hari sejak deletedAt. Status RECOVERABLE masih memerlukan tindakan pemulihan oleh pengguna yang berhak; hasil pindaian tidak langsung memulihkan atau membuat barang baru.

#### 3.6.4 Rancangan Pengujian

Skenario pengujian disusun dari fungsi operasional dan aturan akses. Daftar berikut merupakan cakupan pemeriksaan; status pelaksanaannya dijelaskan pada Bab IV.

1.	Login menggunakan akun dengan status yang sesuai dan akun yang masih berstatus PENDING.

2.	Akun Teknisi atau Universitas mencoba membuka fungsi yang hanya tersedia untuk Admin.

3.	QR Code yang valid dipindai dan sistem menampilkan data barang yang sesuai.

4. Barang berstatus DIPINJAM ditolak pada peminjaman berikutnya dalam urutan biasa. Permintaan peminjaman serentak perlu diuji secara terpisah karena pemeriksaan status dilakukan sebelum transaksi penyimpanan.

5. Berkas Excel diperiksa dalam pratinjau sebelum disimpan. Pemeriksaan meliputi kesesuaian kolom dan ringkasan hasil impor; ketersediaan fungsi pada kode dibedakan dari bukti bahwa seluruh variasi berkas telah diuji.

6. Reset dan penggantian password diperiksa dengan sesi browser terpisah. Sesi lama harus ditolak, login dengan password sementara harus mengikuti kewajiban ganti password, dan sesi baru setelah penggantian harus dapat membaca profil. Akun lain yang tidak menjadi sasaran reset diperiksa untuk memastikan aksesnya tetap berjalan.

## BAB IV HASIL IMPLEMENTASI DAN PEMBAHASAN

### 4.1 Hasil Implementasi Sistem

Hasil pengembangan berupa aplikasi manajemen aset SARPRAS FTI UKSW berbasis web. Admin menggunakan menu Dashboard, Manajemen Aset, serta Tim & Verifikasi. Manajemen Aset memuat Aset, Peminjaman, Riwayat, dan Cashflow. Halaman Teknisi berfokus pada peminjaman, ketersediaan, dan riwayat, sedangkan halaman Universitas menyajikan inventaris dan pengeluaran. Penjelasan implementasi berikut mengacu pada kode yang tersedia sampai 20 Oktober 2026.

### 4.2 Implementasi Pengelolaan Aset

Data aset menyimpan identitas barang, kategori, ruangan, kondisi, status, jumlah, dan informasi pembelian. Kondisi fisik, seperti BAIK atau RUSAK_RINGAN, dibedakan dari status penggunaan TERSEDIA, DIPINJAM, atau MAINTENANCE. Endpoint penambahan dan pembaruan aset mengizinkan Admin serta Teknisi. Pemindahan barang dilakukan melalui pembaruan ruangan pada aset. Penghapusan oleh Admin mengisi deletedAt sehingga data masuk daftar terhapus, tanpa langsung menghilangkan seluruh catatannya. Pemulihan tersedia selama enam hari sejak penghapusan. Penghapusan permanen ditolak apabila barang masih mempunyai riwayat peminjaman. Impor .xlsx menyediakan pratinjau dan ringkasan hasil penyimpanan.

### 4.3 Implementasi QR Code

QR Code dapat dibuat dan dicetak untuk ditempelkan pada barang. Pada halaman Peminjaman, petugas memindai kode atau memasukkannya secara manual untuk mencari aset. Barang yang tersedia dapat dilanjutkan ke formulir peminjaman, sedangkan barang yang sedang dipinjam diperiksa terhadap transaksi aktif untuk proses pengembalian. Pada halaman pemulihan, hasil pencarian mengikuti lima status yang dijelaskan pada Bab III. Penanganan label yang cocok dengan beberapa barang pada alur pemulihan menghasilkan AMBIGUOUS. Pembacaan kamera memakai jsQR dan izin kamera browser; akses kamera memerlukan konteks aman, seperti HTTPS atau localhost. Kesesuaian kamera lintas perangkat masih perlu diuji.

### 4.4 Implementasi Role-Based Access Control

Pemeriksaan akses dilakukan pada halaman dan API. Server memverifikasi tanda tangan serta masa berlaku JWT, lalu membaca akun dari basis data. Role, status verifikasi, dan mustChangePassword menggunakan nilai terbaru. Permintaan tanpa sesi yang sah mendapat HTTP 401, sedangkan akun yang belum disetujui, wajib mengganti password, atau tidak memiliki role yang diperlukan mendapat HTTP 403 pada API operasional. Respons yang membawa profil pengguna memilih field yang diperlukan; hash password tidak ikut dikirim.

Pencabutan sesi memakai sessionVersion pada akun dan JWT. Reset Admin menyimpan hash password sementara, mengaktifkan mustChangePassword, dan menaikkan versi dalam satu pembaruan. Sesi sebelumnya kemudian ditolak. Setelah pengguna login memakai password sementara dan berhasil menggantinya, versi dinaikkan lagi dan browser itu mendapat cookie baru. Pembaruan password juga mensyaratkan versi yang sama dengan sesi yang diperiksa, sehingga reset yang terjadi di tengah proses tidak dapat ditimpa oleh sesi lama. Logout biasa tetap menghapus cookie pada browser yang digunakan.

### 4.5 Implementasi Peminjaman dan Pengembalian

Peminjaman mencatat barang, nama peminjam, ruangan tujuan, akun petugas, dan tenggat pengembalian. Transaksi baru berstatus AKTIF dan mengubah status barang menjadi DIPINJAM. Pengembalian mengisi tanggal kembali dan mengubah transaksi menjadi SELESAI. Barang yang belum dihapus kembali berstatus TERSEDIA. Jika barang telah dihapus, proses pengembalian tidak memulihkannya secara otomatis. Penanda keterlambatan disimpan pada riwayat agar keterlambatan sebelumnya tetap dapat diketahui. Pemeriksaan ketersediaan barang berlangsung sebelum transaksi penyimpanan; karena itu, penggunaan transaksi saja belum menjamin penolakan dua permintaan pinjam yang datang bersamaan.

### 4.6 Implementasi Pengeluaran dan Laporan

Cashflow mencatat pengeluaran dengan jenis PEMBELIAN_ASET, MAINTENANCE, atau LAINNYA. Jenis bukti pembayaran, seperti SPB, kwitansi, dan nota, disimpan terpisah dari jenis pengeluaran. KelompokPembelian menghubungkan beberapa aset dan catatan pengeluaran dalam kelompok yang sama. Lampiran nota disimpan sebagai data URL pada implementasi saat ini. Ekspor pengeluaran tersedia dalam CSV atau Excel bagi Admin, sedangkan pihak Universitas dapat membaca data melalui halaman yang disediakan.

### 4.7 Hasil Pengujian

Pengujian otomatis pada 19 Oktober 2026 menjalankan 60 tes melalui perintah node --test tests/*.test.mjs dan seluruhnya lulus. Sebanyak 13 tes memeriksa pembatasan profil pengguna pada respons API dan ekspor. Sebanyak 47 tes memeriksa sesi, hak akses, reset, dan penggantian password. Tes menggunakan modul aplikasi dengan database dan cookie tiruan, sedangkan verifikasi JWT serta hashing memakai library aplikasi. Pemeriksaan terpisah menggunakan PostgreSQL uji dan permintaan HTTP ke aplikasi hasil build. Jumlah tersebut menunjukkan cakupan tes yang dijalankan, bukan persentase keberhasilan seluruh fitur.

Tabel 4.1. Cakupan dan hasil pengujian yang tersedia pada revisi 20 Oktober 2026

| Pemeriksaan | Lingkungan/bukti | Hasil |
| --- | --- | --- |
| Profil pengguna | 13 tes modul API dan ekspor; database tiruan | Lulus; field profil terpilih, tanpa hash password. |
| Sesi dan akses | 47 tes; JWT/bcrypt nyata, cookie dan database tiruan | Lulus; termasuk token lama, role, reset, dan perubahan bersamaan. |
| Migrasi akun | PostgreSQL uji; akun dibuat sebelum migrasi baru | Lulus; data dan hash tetap, sessionVersion menjadi 0. |
| Penggantian password bersamaan | Prisma dan PostgreSQL uji | Versi sesi bertambah atomik; satu pembaruan dengan versi awal yang sama berhasil. Tidak menguji peminjaman bersamaan. |
| HTTP aplikasi | Next.js hasil build dan PostgreSQL uji | Sesi valid 200; sesi lama setelah reset 401; sesi wajib ganti password 403. |
| Build dan tipe | npm run build; pemeriksaan TypeScript terarah | Build lulus. Tidak ada diagnostik pada tiga berkas autentikasi; pemeriksaan tipe seluruh proyek belum dinyatakan lulus. |
| Pemeriksaan manual | Browser lokal; akun Admin, Teknisi, dan Universitas | Akses normal Admin berhasil. Sesi lama Teknisi tetap 401 setelah reset dan ganti password; sesi baru dapat membaca profil. Akun Universitas tetap 200. |
| Uji lanjutan | Kamera lintas perangkat, beban, dan pengguna SARPRAS | Belum selesai; tidak dihitung sebagai pengujian yang lulus. |

Pengujian manual melalui browser lokal menunjukkan bahwa Admin dapat membuka Dashboard, Peminjaman, Riwayat, Cashflow, serta Tim & Verifikasi. Respons profil yang diperiksa tidak lagi memuat hash password. Sesudah Admin mereset password Teknisi, sesi lama Teknisi mendapat HTTP 401 pada /api/me, sedangkan akun Universitas tetap mendapat HTTP 200. Login menggunakan password sementara menampilkan formulir wajib ganti password dan pesan penolakan akses API sampai password diganti. Setelah penyimpanan password baru, sesi baru dapat membaca profil Teknisi. Sesi lama di Incognito tetap mendapat HTTP 401 saat dimuat ulang. Hasil tersebut memperlihatkan bahwa reset hanya mencabut sesi akun sasaran pada skenario yang diperiksa.

Status HTTP pada tahap wajib ganti password di screenshot manual tidak terlihat, sehingga laporan hanya mencatat pesan penolakan yang tampil. HTTP 403 pada kondisi tersebut telah diperiksa melalui pengujian HTTP terpisah. Pengujian penerimaan bersama SARPRAS, pembacaan kamera lintas perangkat, dan pengujian beban belum dicatat sebagai selesai. Wawancara pada versi yang masih memiliki bug tidak digunakan sebagai pengganti kegiatan-kegiatan tersebut.

### 4.8 Pembahasan

Hasil implementasi menjawab kebutuhan pengelolaan data melalui hubungan aset, ruangan, peminjaman, dan pengeluaran dalam satu aplikasi. QR Code menyediakan cara untuk menemukan data aset, sementara pemeriksaan role membatasi tindakan yang boleh dilakukan pengguna. Namun, keberadaan fitur pada kode dan keberhasilan membuka halaman belum menunjukkan besarnya penghematan waktu kerja. Penilaian manfaat operasional membutuhkan pengukuran serta keterlibatan pengguna SARPRAS.

Pengujian yang paling lengkap pada revisi ini berada pada pembatasan respons pengguna dan pengelolaan sesi. Sebelum perbaikan, penanda wajib ganti password belum cukup untuk mencabut sesi lama secara permanen. Pemeriksaan versi sesi menutup kemungkinan penggunaan kembali token tersebut setelah kewajiban ganti password selesai. Bukti manual memperlihatkan sesi lama tetap ditolak dan sesi baru dapat membaca profil. Hasil ini mendukung perbaikan pada skenario tersebut, tetapi tidak menggantikan pengujian peminjaman serentak, konsistensi keterlambatan, kamera, beban, dan penerimaan pengguna.

## BAB V PENUTUP

### 5.1 Hasil yang Dicapai

Pengembangan pada revisi ini menghasilkan tiga hal berikut.

1. Aplikasi menghubungkan aset, ruangan, peminjaman, pemindahan barang, pengeluaran, kelompok pembelian, dan riwayat aktivitas. QR Code membantu mencari identitas aset, termasuk pada proses pemulihan barang terhapus.

2. Hak akses diterapkan berdasarkan role dan kondisi akun terbaru. Pembatasan field respons menjaga hash password tetap di sisi server, sedangkan sessionVersion mencabut sesi yang diterbitkan sebelum perubahan atau reset password.

3. Seluruh 60 tes otomatis lulus, disertai pemeriksaan migrasi dan perubahan versi sesi pada PostgreSQL uji. Pada pengujian manual, sesi lama tetap ditolak setelah reset dan penggantian password, sementara sesi baru dapat mengakses profil pengguna. Akun lain yang tidak di-reset tetap dapat digunakan. Hasil ini berlaku pada skenario yang diperiksa; pengujian penerimaan pengguna dan beban operasional belum selesai.

### 5.2 Keterbatasan

Pengujian belum mencakup seluruh variasi transaksi, perangkat kamera, dan beban penggunaan. Efisiensi kerja SARPRAS belum diukur secara kuantitatif dan pengujian penerimaan versi terbaru belum selesai. Pada implementasi, lampiran masih disimpan sebagai data URL Base64 di basis data. Peminjaman serentak serta konsistensi aturan keterlambatan juga memerlukan pemeriksaan lanjutan. Dari sisi pemeriksaan kode, build masih menggunakan ignoreBuildErrors; keberhasilan build belum berarti seluruh proyek bebas kesalahan tipe. Pemeriksaan TypeScript yang telah dilakukan hanya mencakup tiga berkas autentikasi yang diubah beserta dependensinya.

### 5.3 Saran

Pengembangan berikutnya perlu mempertimbangkan kebutuhan penggunaan nyata dan temuan pengujian yang belum selesai.

1. Prioritas berikutnya adalah menuntaskan pemeriksaan peminjaman serentak, aturan keterlambatan, dan validasi masukan, kemudian menjalankan uji regresi alur aset, peminjaman, pengembalian, serta pengeluaran. Pengujian bersama SARPRAS perlu mencatat skenario, hasil aktual, dan masukan pengguna agar penerimaan sistem dapat dinilai berdasarkan bukti.

2. Rencana Cloudflare perlu didahului pemeriksaan kompatibilitas Next.js, koneksi PostgreSQL, dan penyimpanan berkas. Login Google melalui email mahasiswa atau SSO memerlukan verifikasi identitas serta kebijakan akun institusi, dengan tetap mempertahankan persetujuan Admin dan pembagian role. Pengujian kamera lintas perangkat, cadangan basis data, dan uji beban dilakukan pada lingkungan tujuan sebelum aplikasi dipublikasikan.

## DAFTAR PUSTAKA

[1] A. Matondang, D. N. D. Sari, M. E. Zuwanda, H. Y. Tumanggor, N. L. Siregar, dan R. N. Simanjuntak, “Rancang Bangun Sistem Informasi Manajemen Aset Berbasis Web Menggunakan QR Code Untuk Meningkatkan Efisiensi Inventarisasi AMIK Universal,” Jutisal Jurnal Teknik Informatika Universal, vol. 3, no. 2, 2023.

[2] J. A. Sitanggang, B. H. Saputra, A. Hidayati, dan H. Saragih, “Design and development of the spacelog web application for inventory management and asset tracking using QR codes at the Cyber Defense Center of the Ministry of Defense,” Jurnal Mandiri IT, vol. 14, no. 3, pp. 283–293, 2026, doi: 10.35335/mandiri.v14i3.481.

[3] R. S. Sandhu, E. J. Coyne, H. L. Feinstein, dan C. E. Youman, “Role-Based Access Control Models,” Computer, vol. 29, no. 2, pp. 38–47, 1996, doi: 10.1109/2.485845.

[4] I. Sommerville, Software Engineering, 10th ed. Pearson, 2015.

[5] DENSO WAVE, “QR Code Error Correction Feature.” [Online]. Available: https://www.qrcode.com/en/about/error_correction.html

[6] Vercel, “Next.js Documentation - App Router.” [Online]. Available: https://nextjs.org/docs/app

[7] PostgreSQL Global Development Group, “PostgreSQL Documentation.” [Online]. Available: https://www.postgresql.org/docs/

[8] Prisma Data, Inc., “Prisma ORM Documentation.” [Online]. Available: https://www.prisma.io/docs/orm
