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

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const dbErrors: { label: string | null; reason: string }[] = [];

    // Gunakan loop berurutan untuk hindari bentrok kategori/ruangan
    for (const row of data) {
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
        }

        const namaFallback = [row.kategori, row.merek, row.tipe].filter(Boolean).join(" ");
        let kondisi = row.kondisi || "BAIK";
        const ketLower = (row.keterangan || "").toLowerCase();
        if (ketLower.includes("rusak berat")) kondisi = "RUSAK_BERAT";
        else if (ketLower.includes("rusak")) kondisi = "RUSAK_RINGAN";

        const hasSticker = !!(row.label || row.labelAset || row.sn);

        if (existingBarang) {
          const isChanged =
            existingBarang.nama !== namaFallback ||
            existingBarang.merek !== (row.merek || null) ||
            existingBarang.model !== (row.model || null) ||
            existingBarang.tipe !== (row.tipe || null) ||
            existingBarang.vendor !== (row.vendor || null) ||
            existingBarang.keterangan !== (row.keterangan || null) ||
            existingBarang.kondisi !== kondisi ||
            existingBarang.ruanganId !== ruanganId ||
            existingBarang.kategoriId !== kategori.id ||
            existingBarang.harga !== (row.harga || null) ||
            existingBarang.sumberTahun !== (row.sumberTahun || null);

          if (!isChanged) {
            skipped++;
          } else {
            await prisma.barang.update({
              where: { id: existingBarang.id },
              data: {
                nama: namaFallback,
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
              }
            });
            updated++;
          }
        } else {
          await prisma.barang.create({
            data: {
              label: row.label || null,
              labelAset: row.labelAset || null,
              sn: row.sn || null,
              nama: namaFallback,
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
          inserted++;
        }
      } catch (err: any) {
        dbErrors.push({ label: row.label || row.sn || "Unknown", reason: err.message });
      }
    }

    return NextResponse.json({
      message: "Proses import selesai",
      stats: { inserted, updated, skipped, errors: dbErrors.length },
      dbErrors
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal menyimpan import" }, { status: 500 });
  }
}
