Lanjutkan maintenance web app ini berdasarkan arsitektur dan pola kode yang sudah kita bangun. Kerjakan revisi berikut saja:



1\. General;

* Penambahan kolom, Nama Barang, dan PROGDI; Sort by Cashflow (baru), tambah sort by cashflow di table view.



2\. Add item - manual input;

* Perubahan sistem label menjadi otomatis convert. Dari Kategori-Merk-Bulan-Tahun-Pembelian ke-? Contoh: Kategori Laptop, Merk Macbook, Bulan 07, tahun 2026, Pembelian ke - 1. Lalu convert menjadi kode (label) dengan mengambil 3 huruf depan Kategori dan merk, sehingga LAP-MAC-072026-001. Lalu untuk keamanannya, jika sebuah merk tersebut memiliki huruf dibawah 3 maka input semua saja. Contoh Laptop Merk HP (LAP-HP-xxxxxx-xxx).
* Lalu ubah urutan prioritas input kolom menjadi Nama Barang, Kategori, Merk, Tanggal Datang,Pembelian ke-?. Untuk mekanisme, pembelian ke-? itu akan melihat melalui tangga/bulan/tahun yang di tentukan atau dipilih users, misal users input 27 Juli 2026, maka otomatis sistem cek pada bulan dan tahun tersebut apakah sudah ada aset yang masuk? sehingga bisa disebut pembelian ke-? maksudnya jika ternyata ada pembelian pada bulan dan tahun tersebut. Maka sistem cek aset tersebut merupakan pembelian ke berapa? Sehingga pada kolom pembelian ke-? akan otomatis i+1 atau akan mengikuti aset pembelian terakhir, misal pembelian terakhir di pembelian ke-5, maka di kolom pembelian input akan menjadi 6 (tetap bisa di set manual). Sehingga untuk penamabahan kolom ada 2 yaitu Nama barang dan Progdi, tujuan supaya Univ tau asset tersebut milik siapa(?) Buat dropdown saja. Ini daftar progdi, untuk membedakan D3/S1-S3 berikan symbol dalam tanda kurung setelah nama progdi (xx):
* Program Diploma (D3):Teknik Informatika (D3)
* Program Sarjana (S1):Teknik Informatika, Sistem Informasi, Desain Komunikasi Visual, Pendidikan Teknik Informatika dan Komputer (PTIK), Hubungan Masyarakat (Public Relations), Perpustakaan dan Sains Informasi, Bisnis Digital
* Program Magister (S2):Magister Sistem Informasi
* Program Doktoral (S3):Doktoral Ilmu Komputer
* Sehingga hasil akhirnya adalah kolom input label atau yang bisa kita bilang kode itu hilang, karena akan otomatis. Namun kamu berikan preview seperti Ketika membuat laporan cashflow, menampilkan kode tapi versi lengkap atau utuh.
* Label Aset itu dari Universitas, lalu selain kolom prioritas yang sudah aku sebutkan diatas itu boleh kosong.
* Kolom cashflow (tapi aku lupa ini flow nya gimana) jadi skip dulu.



3\. Cashflow;

* Penambahan Nama Barang dan Progdi, sama seperti add item karena memang saling berhubungan.
* Tujuan lain ada kolom nama barang karena selama ini menjadikan kategori patokan bahwa itu nama barang, setelah presentasi diminta untuk menambahkan kolom untuk nama barang dan progdi.
* Tambah kategori bukti pembayaran menggunakan dropdown, ada SPB, Kwitansi, Nota. Lalu di sebelah kolom tersebut ada kolom nomor yang bisa di manual input untuk input nomor dari SPB, Kwitansi, Nota;
* Tujuan lain dari nomor dari bukti pembayaran, agar dapat dikategorikan dan ditampilkan. Jika sebelumnya hanya mengambil kode dari convert bulan tahun dan pembelian ke-? Sekarang di tambahkan di bagian depan untuk menyimpan bukti pembayaran yang lebih akurat. Sehingga untuk kode convert sebelumnya di gunakan untuk sebagai pencarian. Contoh Ketika users input di cashflow dengan memilih jenis bukti pembayaran SPB, lalu input nomor SPB missal 03/290-12 (contoh saja, karena aku kurang paham isi nomor dari SPB) jadi nanti kamu buat untuk support number dan symbol seperti -,/,\_, etc. Lalu users input tanggal bulan tahun, missal 27/07/2026, pembelian ke 1. Maka nanti untuk output preview nya menjadi SPB-03/290-12-072026-001; Sehingga kode 072026-001 menjadi seperti atau semacam wadah banyak jenis bukti pembayaran, atau katakanlah sebagai general public code untuk melihat pada bulan, tahun, dan pembelian ke-? punya bukti pembayaran apa saja, untuk mencari tahu asset apa saja yang datang atau dibeli.
* Lalu untuk preview nota di buat dapat muncul, jadi bukan hanya download, tapi muncul preview nota yang responsive juga, lalu jika lebih dari 1 nota di dalam 1 pembelian dapat di geser ke samping menggunakan bottom-scrollbar supaya tidak memanjang ke Bawah.



4\. Otomatisasi;

* Sync data method, jadi gini flow bisnisnya. Semua data yang ada di dalam app ini kan harus saling berhubungan atau punya relasi satu dengan yang lainnya bisa 1 atau many. Sehingga sync method ini aku butuhkan untuk beberapa fitur workflow, tapi fitur yang aku sebutkan itu yang ingin aku implementasikan. Namun jika ternyata untuk sync data method ini berguna ke fitur yang lain bisa kamu jelaskan terlebih dahulu cara kerjanya.
* Tambahkan kolom dropdown cashflow (boleh kosong), tujuan kolom ini jika pada cashflow sudah ada data, maka kolom ini akan menampilkan seluruh kode cashflow yang ada. Kode yang di tampilkan adalah kode dengan jenis nota seperti contoh: SPB-03/290-12-072026-001; artinya data asset yang di input secara otomatis akan berrelasi dengan bukti pembayaran yang di pilih. Sehingga Ketika users cek cashflow dengan kode tersebut, maka barang itu akan masuk daftar pembelian di bukti pembayaran tersebut.
* Method ini akan aku terapkan untuk sync dari aset ke cashflow atau sebaliknya. Study case, jadi karena kita tidak tau dari UNIV akan memberikan bukti pembayaran terlebih dahulu atau aset yang datang terlebih dahulu. Maka workflow: Pada aset, jika users ingin melakukan input data pada manual input. Dapat lihat sync data di cashflow, apakah sudah ada bukti pembayaran atau belum. Lalu bagaimana dengan di input cashflow? sebaliknya juga sama di cashflow. Ketika users input bulan-tahun-pembelian ke-? akan muncul barang yang memiliki kode yang sama. Misal: Setelah user selesai input jenis bukti pembayaran dan nomor bukti pembarayan, akan melakukan input tanggal bulan tahun, untuk pembelian ke-? sama seperti di add item. Akan muncul recent pembelian yang relevan dengan bulan, tahun.
* Lakukan kalibrasi atau penyesuaian add item import atau scan qr. Karena pada input manual ada perubahan.



5\. Panduan;

* Pada bagian add item untuk import dari excel atau csv tambahkan panduan untuk syarat setiap kolom. Study case: karena selama ini data yang dibuat oleh unit masih asal - asalan. Maksudnya gini, dibagian atas kolom choose file tambah button function "Panduan" dengan tujuan untuk arahan data yang valid bagaimana? menampilkan contoh data yang benar di setiap kolom.



6\. Batasan Input;

* Nama Barang (Full char, termasuk symbol dan number), Kaetgori (hanya string alphabet), Kolom label sampai dengan type sama seperti Nama barang. Ruangan Hanya boleh angka atau harus setidaknya mengandung 1 angka untuk identifikasi lantai (sehingga flow system untuk di lantai harus bisa baca angka depan, baik angka di depan string atau di belakang string) atau alternatif Ketika excel di import pada bagian ruangan auto filter kolom tersebut ada angka atau tidak. Kalau ada angka dan string, maka string hapus, pertahankan angka; Contoh R. Pak Budhi 103, system cukup ambil 103 lalu lantai sync angka depan sehingga == lantai 1. Tanggal harus format date (dd/mm/yyyy) supaya tetap bisa sync menjadi kode untuk fitur convert to kode. Harga wajib currency/ number, Tahun file akan ada sedikit perubahan workflow karena tahun file tidak akan hanya baca dari nama file, tapi juga dapat lihat dari tahun di date di dalam file kolom tanggal dating, atau bahkan dari kode label (mmyyyy-xxx) ada tahun tertulis di kode itu. 
* Sehingga kolom status akan dihapus, lalu status badge components akan pindah di sebelah nama barang. Contoh: Asus ROG (badge(tersedia)). Maka kolom yang akan di tampilkan menjadi nama barang, kategori, label, label asset, action.
* Fitur scan QR pada add item sekarang hanya berguna untuk recovery data yang hilang atau terhapus. Apakah data yang terhapus dapat kamu pindahkan ke recently deleted dengan Waktu 5 hari (jika diatas ini auto hapus by system) Lalu Ketika Scan QR harus isi ulang data asset tersebut dengan QR yang sudah ada.



7\. Wajib kalibrasi seluruh system Admin, Teknisi, Universitas;

* Untuk menyesuaikan Kembali system lama dengan update system baru. Agar fungsi fitur dapat berjalan dengan normal, dan berfungsi dengan baik.
* Optimalisasi Fitur UX/ Sistem/ workflow, seperti view statCard, Monitoring system fitur, button, etc.
* Penyesuain Data monitor di Univ dashboard, Prioritaskan barang rusak. Tujuannya apa? Supaya lebih di noticed, jadi jika perlu pengadaan barang, lebih dilihat oleh Univ bahwa barang yang rusak ini perlu dana berapa, keterangannya apa untuk sebab kerusakan. Jadi dari fakultas ingin Univ bisa langsung notice barang rusak.







Pertahankan flow dan fitur lain yang sudah berjalan. Sebelum mengubah kode, identifikasi file yang terdampak dan kemungkinan regresinya. Setelah implementasi, jalankan test, lint, typecheck, dan build yang tersedia. Jangan melakukan refactor di luar scope.

