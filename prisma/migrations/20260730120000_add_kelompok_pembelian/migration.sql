-- CreateTable
CREATE TABLE IF NOT EXISTS "kelompok_pembelian" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "pembelianKe" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelompok_pembelian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "kelompok_pembelian_kode_key" ON "kelompok_pembelian"("kode");

-- AlterTable
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barang' AND column_name = 'kelompokPembelianId') THEN
    ALTER TABLE "barang" ADD COLUMN "kelompokPembelianId" TEXT;
  END IF;
END $$;

-- AlterTable
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pengeluaran' AND column_name = 'kelompokPembelianId') THEN
    ALTER TABLE "pengeluaran" ADD COLUMN "kelompokPembelianId" TEXT;
  END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'barang_kelompokPembelianId_fkey') THEN
    ALTER TABLE "barang" ADD CONSTRAINT "barang_kelompokPembelianId_fkey" FOREIGN KEY ("kelompokPembelianId") REFERENCES "kelompok_pembelian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pengeluaran_kelompokPembelianId_fkey') THEN
    ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_kelompokPembelianId_fkey" FOREIGN KEY ("kelompokPembelianId") REFERENCES "kelompok_pembelian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
