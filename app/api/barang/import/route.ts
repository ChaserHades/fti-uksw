import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { data } = await req.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk di-push" }, { status: 400 });
    }

    const inserted: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const dbErrors: { label: string | null; reason: string }[] = [];

    // Gunakan loop berurutan untuk hindari bentrok kategori/ruangan
    for (const row of data) {
      const itemIdentifier = row.label || row.labelAset || row.sn || row.merek || "Tanpa Nama";
      try {
        if (!row.kategori) throw new Error("Kategori kosong");

        // 1. Resolve Kategori
        let kategori = await prisma.kategori.findUnique({
          where: { nama: row.kategori }
        });
        if (!kategori) {
          kategori = await prisma.kategori.create({
            data: { nama: row.kategori }
          });
        }

        // 2. Resolve Ruangan
        let ruanganId: string | null = null;
        if (row.ruangan) {
          const ruanganStr = String(row.ruangan).trim();
          let ruangan = await prisma.ruangan.findUnique({
            where: { kode: ruanganStr }
          });

          if (!ruangan) {
            // Extract Lantai (First digit)
            const match = ruanganStr.match(/^(\d)/);
            const lantaiStr = match ? `Lantai ${match[1]}` : null;

            ruangan = await prisma.ruangan.create({
              data: { kode: ruanganStr, nama: ruanganStr, lantai: lantaiStr }
            });
          }
          ruanganId = ruangan.id;
        }

        // 3. Find Existing
        const orConditions: any[] = [];
        if (row.label) orConditions.push({ label: row.label });
        if (row.labelAset) orConditions.push({ labelAset: row.labelAset });
        if (row.sn) orConditions.push({ sn: row.sn });

        let existingBarang = null;
        if (orConditions.length > 0) {
          existingBarang = await prisma.barang.findFirst({
            where: { OR: orConditions }
          });
        } else {
          // 4. Fallback matching jika tidak ada SN/Label:
          // Mencocokkan berdasarkan kombinasi field core (identity)
          const fallbackMatches = await prisma.barang.findMany({
            where: {
              sumberTahun: row.sumberTahun || null,
              merek: row.merek || null,
              model: row.model || null,
              tipe: row.tipe || null,
              ruanganId: ruanganId,
              vendor: row.vendor || null,
            }
          });
          
          if (fallbackMatches.length > 0) {
            // Pilih match pertama yang paling mirip
            // (karena ini fallback, kita asumsikan ini barang yang sama jika core identity sama)
            existingBarang = fallbackMatches[0];
          }
        }

        let kondisi = row.kondisi || "BAIK";
        const ketLower = (row.keterangan || "").toLowerCase();
        if (ketLower.includes("rusak berat")) kondisi = "RUSAK_BERAT";
        else if (ketLower.includes("rusak")) kondisi = "RUSAK_RINGAN";

        const hasSticker = !!(row.label || row.labelAset || row.sn);

        if (existingBarang) {
          // 5. Cek SEMUA kolom apakah ada yang berubah (termasuk tanggal)
          const dtDatangExcel = row.tanggalDatang ? new Date(row.tanggalDatang).getTime() : null;
          const dtDatangDB = existingBarang.tanggalDatang ? existingBarang.tanggalDatang.getTime() : null;
          
          const dtPindahExcel = row.tanggalPindah ? new Date(row.tanggalPindah).getTime() : null;
          const dtPindahDB = existingBarang.tanggalPindah ? existingBarang.tanggalPindah.getTime() : null;

          const isChanged =
            existingBarang.merek !== (row.merek || null) ||
            existingBarang.model !== (row.model || null) ||
            existingBarang.tipe !== (row.tipe || null) ||
            existingBarang.vendor !== (row.vendor || null) ||
            existingBarang.keterangan !== (row.keterangan || null) ||
            existingBarang.kondisi !== kondisi ||
            existingBarang.ruanganId !== ruanganId ||
            existingBarang.kategoriId !== kategori.id ||
            existingBarang.harga !== (row.harga || null) ||
            existingBarang.sumberTahun !== (row.sumberTahun || null) ||
            existingBarang.label !== (row.label || null) ||
            existingBarang.labelAset !== (row.labelAset || null) ||
            existingBarang.sn !== (row.sn || null) ||
            dtDatangDB !== dtDatangExcel ||
            dtPindahDB !== dtPindahExcel;

          if (!isChanged) {
            skipped.push(itemIdentifier);
          } else {
            await prisma.barang.update({
              where: { id: existingBarang.id },
              data: {
                merek: row.merek || null,
                model: row.model || null,
                tipe: row.tipe || null,
                vendor: row.vendor || null,
                keterangan: row.keterangan || null,
                kondisi: kondisi as any,
                ruanganId: ruanganId,
                kategoriId: kategori.id,
                harga: row.harga || null,
                sumberTahun: row.sumberTahun || null,
                label: row.label || null,
                labelAset: row.labelAset || null,
                sn: row.sn || null,
                tanggalDatang: row.tanggalDatang ? new Date(row.tanggalDatang) : null,
                tanggalPindah: row.tanggalPindah ? new Date(row.tanggalPindah) : null,
              }
            });
            updated.push(itemIdentifier);
          }
        } else {
          await prisma.barang.create({
            data: {
              label: row.label || null,
              labelAset: row.labelAset || null,
              sn: row.sn || null,
              merek: row.merek || null,
              model: row.model || null,
              tipe: row.tipe || null,
              vendor: row.vendor || null,
              keterangan: row.keterangan || null,
              kondisi: kondisi as any,
              status: "TERSEDIA",
              jumlah: 1,
              hasSticker: hasSticker,
              ruanganId: ruanganId,
              kategoriId: kategori.id,
              tanggalDatang: row.tanggalDatang ? new Date(row.tanggalDatang) : null,
              tanggalPindah: row.tanggalPindah ? new Date(row.tanggalPindah) : null,
              harga: row.harga || null,
              sumberTahun: row.sumberTahun || null,
            }
          });
          inserted.push(itemIdentifier);
        }
      } catch (err: any) {
        dbErrors.push({ label: itemIdentifier, reason: err.message });
      }
    }

    await prisma.logAktivitas.create({
      data: {
        aksi: "IMPORT",
        entitas: "BARANG",
        detail: `Import massal barang. Baru: ${inserted.length}, Diperbarui: ${updated.length}, Dilewati: ${skipped.length}, Error: ${dbErrors.length}`,
        userId: session.id
      }
    });

    return NextResponse.json({
      message: "Proses import selesai",
      stats: { inserted, updated, skipped, errors: dbErrors },
      dbErrors
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal menyimpan import" }, { status: 500 });
  }
}
