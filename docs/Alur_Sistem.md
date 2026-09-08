# Alur Sistem: Manajemen Aset Inventaris FTI UKSW

**Dokumen Pelengkap — Visual Flow Guide**
Dibuat sebagai panduan penguji untuk memahami cara kerja sistem secara menyeluruh.
Dokumen ini adalah pasangan dari `Laporan_Kerja.md` dan mencakup seluruh diagram alur proses bisnis, arsitektur teknis, dan keamanan sistem.

> **Cara Membaca Dokumen Ini**
> Setiap bagian menyajikan alur dalam bentuk diagram Mermaid yang dapat di-render langsung di GitHub, VS Code (Markdown Preview), atau tools lain yang mendukung Mermaid.

---

## Daftar Isi

1. [Arsitektur Teknis Sistem](#1-arsitektur-teknis-sistem)
2. [Alur Autentikasi & Manajemen Pengguna](#2-alur-autentikasi--manajemen-pengguna)
3. [RBAC — Matriks & Alur Penjagaan Akses](#3-rbac--matriks--alur-penjagaan-akses)
4. [Alur Registrasi Aset Manual](#4-alur-registrasi-aset-manual)
5. [Alur Import Massal via Excel](#5-alur-import-massal-via-excel)
6. [Alur QR Code & Recovery Aset](#6-alur-qr-code--recovery-aset)
7. [Siklus Hidup Penghapusan Aset](#7-siklus-hidup-penghapusan-aset)
8. [Alur Peminjaman & Pengembalian](#8-alur-peminjaman--pengembalian)
9. [Alur Cashflow & Kelompok Pembelian](#9-alur-cashflow--kelompok-pembelian)
10. [Relasi Entitas Database (ERD Ringkas)](#10-relasi-entitas-database-erd-ringkas)
11. [Alur Log Aktivitas (Audit Trail)](#11-alur-log-aktivitas-audit-trail)
12. [Ringkasan Alur Lengkap Sistem](#12-ringkasan-alur-lengkap-sistem)

---

## 1. Arsitektur Teknis Sistem

Sistem dibangun di atas arsitektur **Full-Stack Serverless-Ready** berbasis Next.js App Router.
Semua permintaan klien melewati lapisan API Route Handlers sebelum menyentuh database.

```mermaid
flowchart TD
    subgraph CLIENT["Client Layer (Browser)"]
        UI["React 19 UI\n(TailwindCSS v4 + Glassmorphism)"]
    end

    subgraph NEXTJS["Next.js App Router Layer"]
        direction TB
        SC["Server Components\n(Page & Layout)"]
        MW["Middleware\nRoute Guard\n(/admin, /petugas, /universitas)"]
        API["Route Handlers\napp/api/**\n(Serverless Functions)"]
    end

    subgraph SECURITY["Security Layer"]
        AUTH["checkApiAuth()\nlib/auth.ts\n- validasi sesi JWT\n- cek peran RBAC"]
        JWT["jose (JWT)\nSession Token\nlib/session.ts"]
        BCRYPT["bcryptjs\nPassword Hashing"]
    end

    subgraph DATA["Data Layer"]
        ORM["Prisma Client\n(ORM + Transaction)"]
        DB[("PostgreSQL\nDatabase")]
    end

    subgraph EXTERNAL["External / Utilities"]
        EXCEL["exceljs\nImport/Ekspor .xlsx"]
        QR["qrcode\nGenerasi QR Code"]
        ZOD["zod\nValidasi Skema Input"]
        CRON["Cron Job\nGET /api/cron/purge-expired\n(CRON_SECRET)"]
    end

    UI -->|"HTTP Request / Fetch"| MW
    MW -->|"Auth valid - lanjut"| SC
    MW -->|"Auth gagal - redirect login"| UI
    SC -->|"Fetch ke API"| API
    API --> AUTH
    AUTH -->|"Session valid + role OK"| ORM
    AUTH -->|"403 Forbidden"| UI
    ORM -->|"Query / Transaction"| DB
    DB -->|"Result"| ORM
    ORM --> API
    API -->|"JSON Response"| SC
    JWT -.->|"sign / verify"| AUTH
    BCRYPT -.->|"hash / compare"| AUTH
    EXCEL -.->|"parse / generate"| API
    QR -.->|"generate payload"| API
    ZOD -.->|"validate body"| API
    CRON -->|"Auto purge tiap jadwal"| API
```

**Catatan Penting:**
- **Middleware** bekerja di edge — menolak akses halaman sebelum rendering jika tidak ada sesi valid
- **checkApiAuth()** adalah "penjaga kedua" di level API — UI hiding saja tidak cukup, setiap endpoint mutasi memverifikasi peran secara independen
- **Prisma Transaction** digunakan untuk operasi multi-tabel agar konsistensi data terjaga (atomik)

---

## 2. Alur Autentikasi & Manajemen Pengguna

### 2.1. Registrasi & Aktivasi Akun Baru

Sistem menggunakan **Closed-Environment Registration** — pengguna baru tidak langsung aktif.

```mermaid
flowchart TD
    A([Pengguna Baru]) --> B["Buka halaman /register\nIsi: Nama, Email, Password"]
    B --> C["Submit form"]
    C --> D{"Email sudah\nterdaftar?"}
    D -->|Ya| E["Error: Email sudah dipakai"]
    E --> B
    D -->|Tidak| F["Buat akun\nStatus: PENDING\nmustChangePassword: false"]
    F --> G["Akun dibuat\nTampil pesan: Menunggu persetujuan Admin"]
    G --> H([Tunggu])

    subgraph ADMIN_FLOW["Alur Admin - Manajemen Tim"]
        I["Admin buka menu Tim"] --> J["Lihat daftar akun PENDING"]
        J --> K{"Keputusan Admin"}
        K -->|Setujui| L["Status APPROVED"]
        K -->|Tolak| M["Status REJECTED"]
    end

    H -.->|"Admin melihat daftar PENDING"| ADMIN_FLOW
    L --> N["Pengguna dapat login"]
    M --> O["Akun tidak aktif"]
```

### 2.2. Alur Login & Force Password Change

```mermaid
flowchart TD
    A([Pengguna]) --> B["Buka /login\nInput: Email + Password"]
    B --> C["Submit"]
    C --> D{"Akun\nditemukan?"}
    D -->|Tidak| E["Kredensial tidak valid"]
    E --> B
    D -->|Ya| F{"Status\nVerifikasi?"}
    F -->|PENDING| G["Akun belum disetujui"]
    F -->|REJECTED| H["Akun ditolak"]
    F -->|APPROVED| I{"Password\nsesuai?"}
    I -->|Tidak| E
    I -->|Ya| J{"mustChange\nPassword?"}
    J -->|true| K["Redirect ke /force-change-password"]
    K --> L["Pengguna input password baru"]
    L --> M["Update password\nReset flag ke false"]
    M --> N["Redirect ke Dashboard"]
    J -->|false| N
    N --> O{"Peran User"}
    O -->|ADMIN| P["Buka /admin/dashboard"]
    O -->|TEKNISI| Q["Buka /petugas/dashboard"]
    O -->|UNIVERSITAS| R["Buka /universitas/dashboard"]
```

### 2.3. Alur Reset Password oleh Admin

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Frontend
    participant API as API /api/users/[id]
    participant DB as Database

    Admin->>UI: Buka menu Tim, pilih pengguna, klik Reset Sandi
    UI->>API: PATCH {newPassword}
    API->>API: checkApiAuth() - hanya ADMIN
    API->>API: bcryptjs.hash(newPassword)
    API->>DB: UPDATE user SET password=hash, mustChangePassword=true
    DB-->>API: OK
    API-->>UI: 200 Success
    UI-->>Admin: Toast "Sandi berhasil direset"
    Note over DB: Flag mustChangePassword = true tersimpan

    Note over UI: Saat pengguna login berikutnya
    UI->>API: Cek mustChangePassword
    API-->>UI: true
    UI->>UI: Redirect ke /force-change-password
```

---

## 3. RBAC — Matriks & Alur Penjagaan Akses

### 3.1. Alur Penjagaan Akses (Double Guard)

Setiap permintaan melewati **dua lapis penjagaan** yang saling independen.

```mermaid
flowchart LR
    USER([User]) --> REQ["HTTP Request\n(Halaman / API)"]
    REQ --> GUARD1

    subgraph GUARD1["Lapis 1 - Middleware (Edge)"]
        MWCheck{"Sesi JWT valid?"}
        MWCheck -->|Tidak| REDIR["Redirect /login"]
        MWCheck -->|Ya| ROLECHECK{"Path sesuai peran?"}
        ROLECHECK -->|Tidak| REDIR2["Redirect dashboard peran sendiri"]
        ROLECHECK -->|Ya| PASS1["Lanjut ke halaman"]
    end

    PASS1 --> GUARD2

    subgraph GUARD2["Lapis 2 - API Route Handler"]
        APICHECK{"checkApiAuth()\nSesi valid?"}
        APICHECK -->|Tidak| ERR401["401 Unauthorized"]
        APICHECK -->|Ya| PERMCHECK{"Peran berwenang?"}
        PERMCHECK -->|Tidak| ERR403["403 Forbidden"]
        PERMCHECK -->|Ya| EXEC["Eksekusi logika bisnis"]
    end

    EXEC --> DB[("Database")]
    DB --> RESP["JSON Response"]
    RESP --> USER
```

### 3.2. Ringkasan Hak Akses per Peran

| Operasi | ADMIN | TEKNISI | UNIVERSITAS |
|:---|:---:|:---:|:---:|
| Lihat Barang | ALLOW | ALLOW | ALLOW |
| Tambah / Edit Barang | ALLOW | ALLOW | DENY |
| Soft Delete Barang | ALLOW | DENY | DENY |
| Hard Delete Barang | ALLOW | DENY | DENY |
| Restore Barang | ALLOW | ALLOW | DENY |
| Pindah Ruangan | ALLOW | ALLOW | DENY |
| Buat / Selesaikan Peminjaman | ALLOW | ALLOW | DENY |
| Lihat Cashflow | ALLOW | ALLOW | READ ONLY |
| Mutasi Cashflow | ALLOW | DENY | DENY |
| Lihat Log Aktivitas | ALLOW | ALLOW (aksi TEKNISI) | DENY (403) |
| Kelola Pengguna & Tim | ALLOW | DENY | DENY |
| Import Massal | ALLOW | DENY | DENY |

---

## 4. Alur Registrasi Aset Manual

```mermaid
flowchart TD
    A([Admin / Teknisi]) --> B["Buka Manajemen\nTambah Item - Input Manual"]
    B --> C["Isi form:\nNama Barang, Kategori, Merek,\nTanggal Datang, Pembelian ke-?\nRuangan, Kondisi, Harga (opsional)"]

    C --> D["Sistem query KelompokPembelian\nberdasarkan bulan+tahun"]
    D --> E{"KelompokPembelian\nsudah ada untuk\nbulan tersebut?"}
    E -->|Ya| F["Saran pembelianKe:\nauto-increment dari\nnomor terakhir + 1"]
    E -->|Tidak| G["Buat KelompokPembelian baru\nformat: MMYYYY-NNN"]
    F --> H["Generate Label Otomatis"]
    G --> H

    H --> I["Format Label:\n3-huruf-Kat + 3-huruf-Merek + MMYYYY + NNN\nContoh: LAP-MAC-072026-001"]

    I --> J{"Label Aset\n(kode resmi Univ)\ndiisi manual?"}
    J -->|Ya| K["Simpan Label Aset\n(sistem tidak menimpa)"]
    J -->|Tidak| L["Label Aset kosong\n(dapat diisi nanti)"]

    K --> M["Submit Form"]
    L --> M

    M --> N["Sistem buat entri Barang di database"]
    N --> O["Kaitkan ke KelompokPembelian"]
    O --> P["Catat Log: CREATE - BARANG"]
    P --> Q["Aset terdaftar\nStatus: TERSEDIA"]
    Q --> R{"Lanjut buat QR Code?"}
    R -->|Ya| S["Generate QR Code\n(lihat Alur 6)"]
    R -->|Tidak| T([Selesai])
```

---

## 5. Alur Import Massal via Excel

```mermaid
flowchart TD
    A([Admin]) --> B["Buka Manajemen\nTambah Item - Import Excel"]
    B --> C{"Butuh panduan format?"}
    C -->|Ya| D["Klik tombol Panduan\nLihat format kolom & contoh data"]
    D --> E["Siapkan file .xlsx"]
    C -->|Tidak| E

    E --> F["Upload file .xlsx"]
    F --> G["Pre-flight Validation\nassessImportBarangIdentity()"]

    G --> H{"Evaluasi tiap baris"}

    H -->|"Valid:\nAda Nama Barang ATAU Label Aset"| I["Masuk kolom: Siap Diimpor"]
    H -->|"Tidak Valid:\nLabel saja / SN saja / Kategori saja"| J["Masuk kolom: Perlu Diperbaiki"]

    I --> K["Tampil Pemeriksaan Data Import\n(2 kolom + paginasi)"]
    J --> K

    K --> L["Admin review\nFull Table Preview"]
    L --> M{"Konfirmasi Import?"}
    M -->|Batal| N([Batal])
    M -->|Konfirmasi| O["Proses Import Per Baris Valid"]

    O --> P{"labelAset terdaftar\ndi database?"}
    P -->|Ya| Q["UPSERT: Update data existing"]
    P -->|Tidak| R["INSERT: Buat aset baru"]

    Q --> S{"Kategori terisi?"}
    R --> S
    S -->|Ya| T["Gunakan kategori yang dipilih"]
    S -->|Tidak| U["Auto assign: Belum Dikategorikan"]

    T --> V["Simpan ke Database"]
    U --> V

    V --> W["Catat Log: IMPORT - BARANG"]
    W --> X["Tampil Laporan Bento Grid:\nDitambahkan / Diperbarui / Diabaikan / Error"]
    X --> Y([Selesai])
```

---

## 6. Alur QR Code & Recovery Aset

### 6.1. Generate & Cetak QR Code

```mermaid
flowchart LR
    A([Admin / Teknisi]) --> B["Pilih aset di daftar Barang"]
    B --> C["Klik Generate QR"]
    C --> D["Sistem buat payload JSON:\n{id: barangId, kode: labelAset atau label}"]
    D --> E["QR Code ter-generate\n& disimpan ke field qrCode"]
    E --> F{"Cetak sekarang?"}
    F -->|Satu stiker| G["Cetak individual"]
    F -->|Banyak stiker| H["Bulk Print:\nPilih multiple aset\nCetak semua sekaligus (print-ready)"]
    F -->|Nanti| I([QR tersimpan])
    G --> I
    H --> I
```

### 6.2. Alur Scan QR & 5 State Recovery

```mermaid
flowchart TD
    SCAN([Scan QR Code pada aset]) --> PARSE["Parse payload:\nbaca barangId & kode"]
    PARSE --> QUERY["Query database berdasarkan barangId"]

    QUERY --> STATE{"Evaluasi State Aset"}

    STATE -->|"Aset aktif\ndeletedAt = null"| S1["State: ACTIVE\nTampil info lengkap aset\nTidak ada form registrasi baru"]

    STATE -->|"Aset dihapus\n6 hari yang lalu atau kurang"| S2["State: RECOVERABLE\nTampil countdown deadline\nTombol Restore aktif"]

    STATE -->|"Aset dihapus\nlebih dari 6 hari lalu"| S3["State: EXPIRED\nTampil info saja\nTidak bisa restore"]

    STATE -->|"kode cocok lebih dari 1 aset"| S4["State: AMBIGUOUS\nDitolak\nTidak ada resolusi acak"]

    STATE -->|"ID tidak ditemukan"| S5["State: NOT_FOUND\nPesan not found\nTidak ada form registrasi baru"]

    S2 --> RESTORE{"Admin/Teknisi klik Restore?"}
    RESTORE -->|Ya| R1["Hapus deletedAt (set null)"]
    R1 --> R2["Catat Log: UPDATE - BARANG"]
    R2 --> R3["Aset kembali aktif\nStatus: TERSEDIA"]
    RESTORE -->|Tidak| R4([Biarkan])
```

---

## 7. Siklus Hidup Penghapusan Aset

```mermaid
flowchart TD
    ACTIVE["Aset AKTIF\ndeletedAt = null"]

    ACTIVE --> SOFTDEL["Admin klik Hapus Aset"]
    SOFTDEL --> SOFTEXEC["Soft Delete:\ndeletedAt = now()"]

    SOFTEXEC --> DELETED["Aset masuk Recently Deleted\n- Tidak muncul di statistik\n- Tidak bisa dipinjam\n- Tidak bisa dipindah\n- Tidak jadi kandidat Cashflow baru"]

    DELETED --> TIMER{"Sudah berapa hari?"}
    TIMER -->|"6 hari atau kurang\n(Retention Window)"| RECOVERABLE["State: RECOVERABLE\nBisa di-restore"]
    TIMER -->|"Lebih dari 6 hari"| EXPIRED["State: EXPIRED\nTidak bisa restore manual"]

    RECOVERABLE --> CHOICE{"Pilihan Admin"}
    CHOICE -->|"Klik Restore"| RESTORE["Restore:\ndeletedAt = null\nKembali AKTIF"]
    CHOICE -->|"Klik Hard Delete"| HARDDEL{"Ada riwayat Peminjaman?"}

    EXPIRED --> CRON["Cron Job:\nGET /api/cron/purge-expired\n(CRON_SECRET diperlukan)"]
    CRON --> PURGE{"Ada riwayat Peminjaman?"}

    HARDDEL -->|Ya| SKIP1["Skip Hard Delete\njaga integritas historis"]
    HARDDEL -->|Tidak| DESTROY["Hard Delete Permanen\nData hilang dari DB"]

    PURGE -->|Ada| SKIP2["Skip Auto-Purge\njaga integritas historis"]
    PURGE -->|Tidak ada| DESTROY

    RESTORE --> ACTIVE

    subgraph LOAN_NOTE["Catatan: Aset Dipinjam + Soft Delete"]
        LN1["Jika aset di-soft delete saat sedang dipinjam:"]
        LN2["Pengembalian tetap diproses, riwayat aman"]
        LN3["Status aset TIDAK kembali ke TERSEDIA\ndeletedAt tetap terjaga"]
        LN1 --> LN2 --> LN3
    end
```

---

## 8. Alur Peminjaman & Pengembalian

### 8.1. Proses Peminjaman

```mermaid
sequenceDiagram
    actor Staff as Admin atau Teknisi
    participant UI as Frontend
    participant API as API /api/peminjaman
    participant DB as Database

    Staff->>UI: Buka menu Peminjaman
    UI->>API: GET /api/barang (filter: status TERSEDIA)
    API-->>UI: Daftar aset tersedia (bukan soft-deleted)
    UI-->>Staff: Tampil dropdown pilih barang

    Staff->>UI: Pilih barang, isi Nama Peminjam, Ruangan Tujuan, Deadline Kembali
    UI->>API: POST /api/peminjaman dengan barangId, namaPeminjam, ruanganTujuan, deadlineKembali
    API->>API: checkApiAuth() - ADMIN atau TEKNISI
    API->>DB: BEGIN TRANSACTION
    DB-->>API: OK
    API->>DB: INSERT Peminjaman dengan status DIPINJAM, terlambat false
    API->>DB: UPDATE Barang set status DIPINJAM
    API->>DB: INSERT LogAktivitas aksi CREATE entitas PEMINJAMAN
    API->>DB: COMMIT
    DB-->>API: OK
    API-->>UI: 201 Created
    UI-->>Staff: Toast "Peminjaman berhasil dicatat"
```

### 8.2. Proses Pengembalian

```mermaid
flowchart TD
    A([Admin / Teknisi]) --> B["Buka menu Peminjaman\nFilter: Status DIPINJAM"]
    B --> C["Pilih transaksi\nKlik Kembalikan"]
    C --> D["Sistem catat tanggalKembali = now()"]

    D --> E{"tanggalKembali\n> deadlineKembali + jam 18:00 WIB?"}
    E -->|Ya| F["Flag: terlambat = true\n(persisten, tidak bisa diubah)"]
    E -->|Tidak| G["terlambat = false"]

    F --> H["Update status Peminjaman ke DIKEMBALIKAN"]
    G --> H

    H --> I{"Barang sudah di-soft delete?"}
    I -->|Ya| J["Status Barang TETAP (tidak kembali ke TERSEDIA)\ndeletedAt tetap ada"]
    I -->|Tidak| K["Update status Barang ke TERSEDIA"]

    J --> L["Catat Log: UPDATE - PEMINJAMAN"]
    K --> L
    L --> M["Pengembalian selesai\nRiwayat aman tersimpan"]
```

---

## 9. Alur Cashflow & Kelompok Pembelian

### 9.1. Tambah Pengeluaran Baru

```mermaid
flowchart TD
    A([Admin]) --> B["Buka Laporan Keuangan\nTambah Pengeluaran"]
    B --> C["Isi form:\nJudul, Nama Barang, Progdi,\nNominal, Tanggal,\nJenis: SPB / Kwitansi / Nota,\nNomor Bukti, Upload file nota"]

    C --> D["Generate Kode Pengeluaran Otomatis:\nJENIS-NOMOR-MMYYYY-NNN\nContoh: SPB-03/290-12-072026-001"]

    D --> E["Generate Kode Pembelian Umum:\nMMyyyy-NNN (wadah pengelompokan)"]

    E --> F{"KelompokPembelian\nuntuk periode ini sudah ada?"}
    F -->|Ya| G["Reuse KelompokPembelian yang ada"]
    F -->|Tidak| H["Buat KelompokPembelian baru"]

    G --> I["Tampil Candidate Assets\n(checkbox - aset yang bisa direlasikan)"]
    H --> I

    I --> J{"Admin pilih aset terkait?"}
    J -->|Ya| K["Kaitkan Barang ke Pengeluaran\nvia KelompokPembelian"]
    J -->|Tidak| L["Pengeluaran berdiri sendiri\ntanpa relasi aset"]

    K --> M["Simpan ke Database\nSimpan file nota ke storage"]
    L --> M

    M --> N["Catat Log: CREATE - PENGELUARAN"]
    N --> O["Pengeluaran tercatat\nPreview nota dapat dibuka di browser"]
```

### 9.2. Sinkronisasi Dua Arah (Two-Way Sync)

```mermaid
flowchart TD
    subgraph ASSET["Dari Aset ke Cashflow"]
        B1["Form Input Manual Aset\natau Edit Aset"]
        B1 --> BD["Dropdown async:\nPilih Cashflow yang sudah ada"]
        BD -->|"Memilih cashflow"| KP
    end

    subgraph CASHFLOW["Dari Cashflow ke Aset"]
        C1["Form Tambah/Edit Pengeluaran"]
        C1 --> CD["Checkbox:\nPilih Aset yang terkait"]
        CD -->|"Memilih aset"| KP
    end

    KP["KelompokPembelian\nkode: MMYYYY-NNN\nMenaungi banyak Barang\n& banyak Pengeluaran"]

    NOTE["Aturan Keamanan:\nHapus Pengeluaran\ntidak menghapus Barang yang terkait"]
```

---

## 10. Relasi Entitas Database (ERD Ringkas)

```mermaid
erDiagram
    USER {
        String id PK
        String email UK
        String name
        Role role "ADMIN or TEKNISI or UNIVERSITAS"
        StatusVerifikasi statusVerifikasi "PENDING or APPROVED or REJECTED"
        Boolean mustChangePassword
    }

    KATEGORI {
        String id PK
        String nama
    }

    RUANGAN {
        String id PK
        String kode UK
        String nama
        String lantai
    }

    KELOMPOK_PEMBELIAN {
        String id PK
        String kode UK "MMYYYY-NNN"
        DateTime tanggal
        Int pembelianKe
    }

    BARANG {
        String id PK
        String namaBarang
        String label "Auto: KAT-MRK-MMYYYY-NNN"
        String labelAset "Kode resmi Universitas"
        KondisiBarang kondisi "BAIK atau RUSAK_RINGAN atau RUSAK_BERAT"
        StatusBarang status "TERSEDIA atau DIPINJAM"
        DateTime deletedAt "Soft delete timestamp - null jika aktif"
        String kategoriId FK
        String ruanganId FK
        String pengeluaranId FK
        String kelompokPembelianId FK
    }

    PEMINJAMAN {
        String id PK
        String barangId FK
        String userId FK
        String namaPeminjam
        DateTime deadlineKembali
        DateTime tanggalKembali
        StatusPeminjaman status "DIPINJAM atau DIKEMBALIKAN"
        Boolean terlambat
    }

    PENGELUARAN {
        String id PK
        String judul
        Float nominal
        JenisPengeluaran jenis "SPB atau KWITANSI atau NOTA"
        String[] notaUrls
        String kodePembelian "MMYYYY-NNN"
        String kelompokPembelianId FK
        String userId FK
    }

    LOG_AKTIVITAS {
        String id PK
        AksiLog aksi "CREATE atau UPDATE atau DELETE atau IMPORT"
        String entitas "BARANG atau PEMINJAMAN atau PENGELUARAN dll"
        String detail
        String userId FK
        DateTime createdAt
    }

    USER ||--o{ PEMINJAMAN : "mencatat"
    USER ||--o{ PENGELUARAN : "menginput"
    USER ||--o{ LOG_AKTIVITAS : "merekam"
    KATEGORI ||--o{ BARANG : "mengklasifikasikan"
    RUANGAN ||--o{ BARANG : "menyimpan"
    BARANG ||--o{ PEMINJAMAN : "direkam dalam"
    KELOMPOK_PEMBELIAN ||--o{ BARANG : "menaungi"
    KELOMPOK_PEMBELIAN ||--o{ PENGELUARAN : "menaungi"
    BARANG }o--o| PENGELUARAN : "terhubung ke"
```

**Catatan Relasi Penting:**

| Relasi | Penjelasan |
|:---|:---|
| `BARANG ? PENGELUARAN` | Opsional: satu aset bisa punya satu bukti cashflow, satu cashflow bisa tanpa aset |
| `KELOMPOK_PEMBELIAN ? BARANG` | Satu KelompokPembelian menaungi banyak aset (satu periode pembelian) |
| `KELOMPOK_PEMBELIAN ? PENGELUARAN` | Satu KelompokPembelian bisa punya banyak bukti bayar (SPB, Kwitansi, Nota) |
| `deletedAt` | Soft delete — aset dengan nilai ini dikecualikan dari semua alur operasional |

---

## 11. Alur Log Aktivitas (Audit Trail)

### 11.1. Mekanisme Pencatatan Log

```mermaid
flowchart TD
    ACTION["Aksi Pengguna\n(Tambah/Edit/Hapus/Import/dll)"]
    ACTION --> API["Route Handler\n(POST / PATCH / DELETE / dll)"]
    API --> AUTH["checkApiAuth()\nverifikasi sesi & peran"]
    AUTH --> EXEC["Eksekusi logika bisnis\n(query / transaction ke DB)"]
    EXEC --> LOG["INSERT LogAktivitas:\naksi: CREATE/UPDATE/DELETE/IMPORT\nentitas: BARANG/PEMINJAMAN/PENGELUARAN/RUANGAN/KATEGORI\nentitasId: ID objek yang diubah\ndetail: keterangan spesifik\nuserId: ID pelaku\ncreatedAt: timestamp"]
    LOG --> RESP["Response ke Frontend"]
```

### 11.2. Visibilitas Log per Peran

```mermaid
flowchart TD
    REQ([Buka halaman Log Aktivitas]) --> CHECK{"Peran pengguna?"}

    CHECK -->|ADMIN| A["Lihat SEMUA log\nDari semua pengguna\nSemua entitas"]
    CHECK -->|TEKNISI| T["Lihat log dari pengguna berperan TEKNISI\nbukan hanya log diri sendiri"]
    CHECK -->|UNIVERSITAS| U["403 Forbidden\nTidak dapat mengakses Log Aktivitas"]
```

### 11.3. Cakupan 18 Operasi yang Dicatat

| No | Operasi | Entitas | Aksi Log |
|:---:|:---|:---|:---|
| L1 | Tambah Barang | BARANG | CREATE |
| L2 | Edit Barang | BARANG | UPDATE |
| L3 | Pindah Ruangan | BARANG | UPDATE |
| L4 | Soft Delete Barang | BARANG | DELETE |
| L5 | Restore Barang | BARANG | UPDATE |
| L6 | Hard Delete Barang | BARANG | DELETE |
| L7 | Import Massal Barang | BARANG | IMPORT |
| L8 | Buat Peminjaman | PEMINJAMAN | CREATE |
| L9 | Pengembalian | PEMINJAMAN | UPDATE |
| L10 | Tambah Cashflow | PENGELUARAN | CREATE |
| L11 | Edit Cashflow | PENGELUARAN | UPDATE |
| L12 | Hapus Cashflow | PENGELUARAN | DELETE |
| L13 | Tambah Ruangan | RUANGAN | CREATE |
| L14 | Edit Ruangan | RUANGAN | UPDATE |
| L15 | Hapus Ruangan | RUANGAN | DELETE |
| L16 | Tambah Kategori | KATEGORI | CREATE |
| L17 | Edit Kategori | KATEGORI | UPDATE |
| L18 | Hapus Kategori | KATEGORI | DELETE |

---

## 12. Ringkasan Alur Lengkap Sistem

```mermaid
flowchart TD
    subgraph ONBOARD["Onboarding Pengguna"]
        REG["Register\nStatus: PENDING"] --> APPROVE["Admin Approve\nStatus: APPROVED"] --> LOGIN["Login\nDapat JWT Session"]
    end

    subgraph ASSET_MGMT["Manajemen Aset"]
        MANUAL["Input Manual\nAuto Label\nKelompokPembelian"] --> QR_GEN["Generate QR\nCetak Stiker"]
        IMPORT["Import Excel\nPreflight Validation\nUpsert atau Insert"]
    end

    subgraph LENDING["Peminjaman"]
        BORROW["Buat Peminjaman\nStatus: DIPINJAM"] --> RETURN["Kembalikan\nEvaluasi Terlambat\nStatus: DIKEMBALIKAN"]
    end

    subgraph FINANCE["Keuangan / Cashflow"]
        EXPENSE["Tambah Pengeluaran\nAuto Kode\nUpload Nota"] --> LINK["Two-Way Sync\nKaitkan ke Aset\nvia KelompokPembelian"]
    end

    subgraph DELETION["Siklus Hapus"]
        SOFT["Soft Delete\ndeletedAt diisi"] --> WINDOW["Retention 6 Hari"]
        WINDOW --> RESTORE["Restore Manual\ndalam window"]
        WINDOW --> HARD["Hard Delete atau Auto-Purge\nlewat window via CRON"]
    end

    subgraph AUDIT["Audit & Laporan"]
        LOGS["Log Aktivitas\n18 operasi otomatis"]
        EXPORT["Ekspor .xlsx\nBarang/Peminjaman/Pengeluaran"]
        DASH_UNIV["Dashboard Universitas\nBento Grid Eksekutif"]
    end

    LOGIN --> ASSET_MGMT
    LOGIN --> LENDING
    LOGIN --> FINANCE
    LOGIN --> DELETION
    ASSET_MGMT --> AUDIT
    LENDING --> AUDIT
    FINANCE --> AUDIT
    DELETION --> AUDIT
```

---

*Dokumen ini adalah bagian dari Laporan Kerja Sistem Manajemen Aset Inventaris FTI UKSW.*
*Dibaca bersama dengan `Laporan_Kerja.md` untuk pemahaman teknis yang lengkap.*
*Commit Final: `713c57d` — Rilis Final, Juli 2026.*
