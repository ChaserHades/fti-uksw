import { prisma } from '../lib/prisma';

async function fixTipeRuangan() {
  console.log("Fetching barangs...");
  const allBarang = await prisma.barang.findMany({
    where: { tipe: { not: null } },
    include: { kategori: true }
  });

  let count = 0;
  for (const b of allBarang) {
    if (b.tipe && /^\d{3}$/.test(b.tipe.trim())) {
      const ruanganStr = b.tipe.trim();
      let ruangan = await prisma.ruangan.findUnique({ where: { kode: ruanganStr } });
      if (!ruangan) {
        const match = ruanganStr.match(/^(\d)/);
        const lantaiStr = match ? `Lantai ${match[1]}` : null;
        ruangan = await prisma.ruangan.create({
          data: { kode: ruanganStr, nama: ruanganStr, lantai: lantaiStr }
        });
      }

      const newNama = [b.kategori?.nama, b.merek, null].filter(Boolean).join(" ");

      await prisma.barang.update({
        where: { id: b.id },
        data: {
          tipe: null,
          ruanganId: ruangan.id,
        }
      });
      console.log(`Fixed ${b.label || b.id}: tipe ${b.tipe} -> ruangan ${ruanganStr}, nama -> ${newNama}`);
      count++;
    }
  }
  console.log(`Finished fixing ${count} records.`);
}

fixTipeRuangan().catch(console.error).finally(() => prisma.$disconnect());
