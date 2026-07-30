import { prisma } from '../lib/prisma';

async function backfill() {
  console.log("Starting backfill...");

  // Process Pengeluaran
  const pengeluarans = await prisma.pengeluaran.findMany();
  for (const p of pengeluarans) {
    if (p.kodePembelian && !p.kelompokPembelianId) {
      // e.g. "072026-001"
      let kelompok = await prisma.kelompokPembelian.findUnique({
        where: { kode: p.kodePembelian }
      });

      if (!kelompok) {
        kelompok = await prisma.kelompokPembelian.create({
          data: {
            kode: p.kodePembelian,
            tanggal: p.tanggal,
            pembelianKe: p.pembelianKe || parseInt(p.kodePembelian.split('-')[1] || "1", 10),
          }
        });
        console.log(`Created KelompokPembelian ${p.kodePembelian}`);
      }

      await prisma.pengeluaran.update({
        where: { id: p.id },
        data: { kelompokPembelianId: kelompok.id }
      });
    }
  }

  // Process Barang
  const barangs = await prisma.barang.findMany({
    include: { pengeluaran: true }
  });

  for (const b of barangs) {
    if (!b.kelompokPembelianId) {
      let kelompokId = null;

      // Prioritize existing pengeluaran relation
      if (b.pengeluaran?.kelompokPembelianId) {
        kelompokId = b.pengeluaran.kelompokPembelianId;
      } else if (b.label) {
        // Fallback to label parsing: e.g., LAP-MAC-072026-001 -> 072026-001
        const parts = b.label.split('-');
        if (parts.length >= 2) {
          const suffix = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
          if (suffix.match(/^\d{6}-\d{3}$/)) {
            let kelompok = await prisma.kelompokPembelian.findUnique({
              where: { kode: suffix }
            });
            if (!kelompok) {
               // Create if missing based on Barang data
               const d = b.tanggalDatang || new Date();
               kelompok = await prisma.kelompokPembelian.create({
                 data: {
                   kode: suffix,
                   tanggal: d,
                   pembelianKe: b.pembelianKe || parseInt(parts[parts.length - 1], 10),
                 }
               });
               console.log(`Created KelompokPembelian from Barang label: ${suffix}`);
            }
            kelompokId = kelompok.id;
          }
        }
      }

      if (kelompokId) {
        await prisma.barang.update({
          where: { id: b.id },
          data: { kelompokPembelianId: kelompokId }
        });
      }
    }
  }

  console.log("Backfill complete.");
}

backfill()
  .catch(console.error)
  .finally();
