# BAB I: PENDAHULUAN

## 1.1 Latar Belakang Masalah
Fakultas Teknologi Informasi Universitas Kristen Satya Wacana (FTI UKSW) sebagai institusi pendidikan yang terus berkembang, memiliki infrastruktur dan fasilitas laboratorium yang krusial. Fasilitas tersebut mencakup berbagai aset inventaris fisik laboratorium (seperti komputer, server, mikrokontroler, komponen elektronika, dan perangkat keras pendukung lainnya) yang tersebar di berbagai ruangan. Seiring bertambahnya jumlah praktikum, mahasiswa, dan staf pengajar, pengadaan serta pengelolaan inventaris aset laboran menjadi semakin penting untuk mendukung kelancaran aktivitas akademik.

Namun demikian, pengelolaan inventaris fisik yang berjalan selama ini masih memiliki sejumlah tantangan operasional. Proses pencatatan perpindahan barang (mutasi), pelacakan riwayat peminjaman aset, serta kalkulasi sisa barang rusak masih banyak bergantung pada metode pencatatan konvensional dan dokumen fisik. Metode ini memiliki risiko tinggi terhadap hilangnya data (data loss), duplikasi pencatatan, ketidaksesuaian jumlah aktual di lapangan dengan data di laporan, serta lambatnya penyajian informasi kepada pihak pimpinan atau rektorat universitas.

Selain itu, belum adanya sistem identifikasi yang cepat dan unik untuk setiap aset (seperti _QR Code_) membuat proses inspeksi di lapangan (audit aset) memakan waktu lama. Teknisi laboratorium seringkali kesulitan memastikan spesifikasi dan riwayat penggunaan sebuah perangkat hanya dengan melihat wujud fisiknya.

Berdasarkan permasalahan tersebut, dibutuhkan suatu sistem informasi digital yang terpusat untuk meminimalisasi kesalahan manusia (human error) dan meningkatkan efisiensi operasional harian laboratorium. Oleh karena itu, Tugas Talenta Unggul (TTU) ini bertujuan untuk melakukan **"Rancang Bangun Sistem Manajemen Aset Laboran FTI UKSW Berbasis Web dengan QR Code dan Role-Based Access Control"**. Sistem ini diharapkan dapat memberikan visibilitas aset laboratorium secara terintegrasi, mengamankan data melalui manajemen akses pengguna (RBAC), memfasilitasi audit _real-time_ melalui pindaian QR Code, serta menghasilkan pelaporan aset secara presisi.

---

# BAB II: METODE PENELITIAN

## 2.1 Jenis Penelitian
Penelitian ini merupakan jenis penelitian terapan (_Applied Research_) di bidang Rekayasa Perangkat Lunak (Software Engineering). Penelitian difokuskan pada perancangan, pengembangan, dan pengujian sistem informasi berbasis *web* untuk menyelesaikan masalah manajemen aset di FTI UKSW secara spesifik dan praktis.

## 2.2 Metode Pengumpulan Data
Untuk memperoleh informasi dan spesifikasi sistem yang relevan, tahapan pengumpulan data dilakukan melalui:
1. **Studi Literatur:** Mengkaji penelitian terdahulu yang berkaitan dengan sistem informasi inventaris, pemanfaatan teknologi *QR Code*, pola desain basis data relasional, dan arsitektur *web* modern.
2. **Observasi dan Wawancara (Hipotetis):** Melakukan peninjauan langsung ke laboratorium dan fasilitas FTI UKSW untuk mengamati alur pencatatan aset (pengadaan, pemindahan, peminjaman). Wawancara dilakukan kepada pihak teknisi dan tata usaha untuk menangkap _Business Requirement_.

## 2.3 Metode Pengembangan Sistem
Penelitian ini menggunakan model pengembangan perangkat lunak _Agile Development_, spesifiknya menggunakan kerangka kerja (framework) _Scrum_ atau iterasi _Prototyping_. Pemilihan metode ini didasari oleh fleksibilitas dalam mengakomodasi perubahan kebutuhan antarmuka (UI) dan logika bisnis seiring berkembangnya pengembangan sistem. Tahapan yang dilalui meliputi:
1. **Analisis Kebutuhan (Requirements Analysis):** Mendefinisikan peran pengguna (Admin, Teknisi, Universitas), hak akses, dan entitas utama basis data (User, Barang, Kategori, Ruangan, Peminjaman, Pengeluaran).
2. **Perancangan Sistem (System Design):** Memodelkan struktur basis data dengan _Entity Relationship Diagram_ (ERD), merancang topologi relasi antar tabel (seperti integrasi Barang ke Ruangan dan Peminjaman), serta merancang purwarupa antarmuka (UI) berbasis _Glassmorphism_.
3. **Implementasi Kode (Implementation):**
   - **Frontend & Backend (Fullstack):** Menggunakan *framework* **Next.js (App Router)** dengan arsitektur berbasis komponen *(React)* untuk menghasilkan *Single Page Application* yang cepat, responsif, dan siap untuk perutean API di satu wadah.
   - **Database Management:** Menggunakan **Prisma ORM** yang dihubungkan dengan *database engine* relasional **PostgreSQL** untuk menjaga keamanan tipe statis (*type safety*) dan integritas referensial.
   - **Keamanan (Security):** Menyematkan algoritma kriptografi _bcrypt_ untuk pengacakan *password*, serta *middleware* untuk otentikasi lapis atas berdasarkan tipe _Role_. Selain itu, level _Backend_ API dilindungi menggunakan _guard_ tersentralisasi yang memblokir mutasi data dari akun berstatus _Pending_ serta menolak parameter numerik ekstrem (anti-glitches), guna menjaga integritas *database*.
   - **Transparansi Alur Impor (Import Workflow):** Modul impor data memfasilitasi fungsi *Pre-flight Check* menggunakan navigasi paginasi Next/Prev untuk peninjauan baris data *error* dan *valid*. Pada saat proses eksekusi simpan ke *database*, sistem memberikan pelaporan mutakhir (*Bento Grid Report*) yang merincikan perbandingan status injeksi data secara transparan: Data Baru, Data Diperbarui, Data Dilewati (identik), dan Kegagalan/Error.
   - **Pemrosesan Utilitas:** Implementasi *library* `qrcode` untuk konversi identitas aset menjadi matriks kode yang siap dipindai kamera, serta `exceljs` untuk rekapitulasi data.
4. **Pengujian (Testing):** Melakukan _Black-box testing_ untuk mengevaluasi keluaran antarmuka, mencakup pengujian perutean otentikasi (Route Guards), uji responsivitas fitur pemindaian kamera, serta konfirmasi manipulasi data (CRUD) aset. 
5. **Pemeliharaan (Maintenance):** Siklus iterasi yang memungkinkan peningkatan kinerja berbasis umpan balik pengguna.
