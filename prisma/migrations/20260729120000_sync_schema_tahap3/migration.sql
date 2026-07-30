-- CreateEnum
CREATE TYPE "StatusPeminjaman" AS ENUM ('AKTIF', 'SELESAI');

-- CreateEnum
CREATE TYPE "JenisPengeluaran" AS ENUM ('PEMBELIAN_ASET', 'MAINTENANCE', 'LAINNYA');

-- CreateEnum
CREATE TYPE "AksiLog" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'TEKNISI', 'UNIVERSITAS');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TEKNISI';
COMMIT;

-- DropForeignKey
ALTER TABLE "barang" DROP CONSTRAINT "barang_kategoriId_fkey";

-- DropForeignKey
ALTER TABLE "transaksi" DROP CONSTRAINT "transaksi_barangId_fkey";

-- DropForeignKey
ALTER TABLE "transaksi" DROP CONSTRAINT "transaksi_userId_fkey";

-- DropIndex
DROP INDEX "barang_kodeBarang_key";

-- AlterTable
ALTER TABLE "barang" DROP COLUMN "deskripsi",
DROP COLUMN "kodeBarang",
DROP COLUMN "nama",
DROP COLUMN "tahunBeli",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "keterangan" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "labelAset" TEXT,
ADD COLUMN     "merek" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "namaBarang" TEXT,
ADD COLUMN     "pembelianKe" INTEGER,
ADD COLUMN     "pengeluaranId" TEXT,
ADD COLUMN     "progdi" TEXT,
ADD COLUMN     "sn" TEXT,
ADD COLUMN     "sumberTahun" TEXT,
ADD COLUMN     "tanggalDatang" TIMESTAMP(3),
ADD COLUMN     "tanggalPindah" TIMESTAMP(3),
ADD COLUMN     "tipe" TEXT,
ADD COLUMN     "vendor" TEXT;

-- AlterTable
ALTER TABLE "ruangan" DROP COLUMN "gedung",
DROP COLUMN "kapasitas";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'TEKNISI';

-- DropTable
DROP TABLE "kategori_barang";

-- DropTable
DROP TABLE "transaksi";

-- DropEnum
DROP TYPE "StatusTransaksi";

-- CreateTable
CREATE TABLE "kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peminjaman" (
    "id" TEXT NOT NULL,
    "barangId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namaPeminjam" TEXT NOT NULL,
    "ruanganTujuan" TEXT NOT NULL,
    "tanggalPinjam" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggalKembali" TIMESTAMP(3),
    "deadlineKembali" TIMESTAMP(3) NOT NULL,
    "status" "StatusPeminjaman" NOT NULL DEFAULT 'AKTIF',
    "terlambat" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peminjaman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengeluaran" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "namaBarang" TEXT,
    "progdi" TEXT,
    "deskripsi" TEXT,
    "nominal" DOUBLE PRECISION NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenis" "JenisPengeluaran" NOT NULL,
    "jenisBukti" TEXT,
    "nomorBukti" TEXT,
    "notaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kodePembelian" TEXT,
    "pembelianKe" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_aktivitas" (
    "id" TEXT NOT NULL,
    "aksi" "AksiLog" NOT NULL,
    "entitas" TEXT NOT NULL DEFAULT 'BARANG',
    "entitasId" TEXT,
    "detail" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_aktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kategori_nama_key" ON "kategori"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "barang_label_key" ON "barang"("label");

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_pengeluaranId_fkey" FOREIGN KEY ("pengeluaranId") REFERENCES "pengeluaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

