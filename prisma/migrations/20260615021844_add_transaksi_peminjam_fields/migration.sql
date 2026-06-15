/*
  Warnings:

  - Added the required column `namaPeminjam` to the `transaksi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ruanganPinjam` to the `transaksi` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transaksi" ADD COLUMN     "namaPeminjam" TEXT NOT NULL,
ADD COLUMN     "ruanganPinjam" TEXT NOT NULL;
