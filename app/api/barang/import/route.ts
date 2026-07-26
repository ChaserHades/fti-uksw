import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const sanitizeUnique = (val: any) => {
  if (!val) return null;
  const str = String(val).trim();
  if (str === "-" || str.toLowerCase() === "tanpa nama") return null;
  return str;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { data, fileName } = await req.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk di-push" }, { status: 400 });
    }

    const safeFileName = fileName || "Unknown-File";
    const existingLog = await prisma.logAktivitas.findFirst({
      where: {
        aksi: "IMPORT",
        entitas: "BARANG",
        detail: { startsWith: `Import file: ${safeFileName}` }
      }
    });
    const isUpdateMode = !!existingLog;

    const inserted: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const dbErrors: { label: string | null; reason: string }[] = [];
    const usedDbIds = new Set<string>();

    // Process sequentially
    for (const row of data) {
      const safeLabel = sanitizeUnique(row.label);
      const safeLabelAset = sanitizeUnique(row.labelAset);
      const safeSn = sanitizeUnique(row.sn);
      const safeMerek = sanitizeUnique(row.merek);
      
      const itemIdentifier = safeLabel || safeLabelAset || safeSn || safeMerek || "Tanpa Nama";

      try {
        if (!row.kategori) throw new Error("Kategori kosong");

        // Resolve Kategori
        let kategori = await prisma.kategori.findUnique({
          where: { nama: row.kategori }
        });
        if (!kategori) {
          kategori = await prisma.kategori.create({
            data: { nama: row.kategori }
          });
        }

        // Resolve Ruangan
        let ruanganId: string | null = null;
        if (row.ruangan) {
          const ruanganStr = String(row.ruangan).trim();
          let ruangan = await prisma.ruangan.findUnique({
            where: { kode: ruanganStr }
          });

          if (!ruangan) {
            const match = ruanganStr.match(/^(\d)/);
            const lantaiStr = match ? `Lantai ${match[1]}` : null;

            ruangan = await prisma.ruangan.create({
              data: { kode: ruanganStr, nama: ruanganStr, lantai: lantaiStr }
            });
          }
          ruanganId = ruangan.id;
        }

        // Find Existing with Exact Match
        let existingBarang = null;

        if (safeLabel) {
          // Cari berdasarkan label
          existingBarang = await prisma.barang.findUnique({
            where: { label: safeLabel }
          });
          
          if (existingBarang && usedDbIds.has(existingBarang.id)) {
            // Duplikat dalam 1 file
            dbErrors.push({
              label: itemIdentifier,
              reason: "Data duplikat terdeteksi di dalam file Excel (Label sudah diproses di baris atasnya)"
            });
            continue;
          }
        } else if (safeLabelAset || safeSn) {
          // Gunakan pencocokan field lain
          const exactMatchConditions: any = { kategoriId: kategori.id };
          if (safeLabelAset) exactMatchConditions.labelAset = safeLabelAset;
          if (safeSn) exactMatchConditions.sn = safeSn;

          const possibleMatches = await prisma.barang.findMany({
            where: exactMatchConditions
          });
          
          // Filter data yang sudah dipakai
          existingBarang = possibleMatches.find(m => !usedDbIds.has(m.id)) || null;
        }
        
        if (existingBarang) {
          usedDbIds.add(existingBarang.id);
        }

        let kondisi = row.kondisi || "BAIK";
        const ketLower = (row.keterangan || "").toLowerCase();
        if (ketLower.includes("rusak berat")) kondisi = "RUSAK_BERAT";
        else if (ketLower.includes("rusak")) kondisi = "RUSAK_RINGAN";

        const hasSticker = !!(safeLabel || safeLabelAset || safeSn);

        if (existingBarang) {
          if (isUpdateMode) {
            // Cek perubahan data
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
              existingBarang.label !== safeLabel ||
              existingBarang.labelAset !== safeLabelAset ||
              existingBarang.sn !== safeSn ||
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
                  label: safeLabel,
                  labelAset: safeLabelAset,
                  sn: safeSn,
                  tanggalDatang: row.tanggalDatang ? new Date(row.tanggalDatang) : null,
                  tanggalPindah: row.tanggalPindah ? new Date(row.tanggalPindah) : null,
                }
              });
              updated.push(itemIdentifier);
            }
          } else {
            // New File, but found existing item -> Skip
            skipped.push(itemIdentifier);
          }
        } else {
          // INSERT
          const newBarang = await prisma.barang.create({
            data: {
              label: safeLabel,
              labelAset: safeLabelAset,
              sn: safeSn,
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
          usedDbIds.add(newBarang.id);
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
        detail: `Import file: ${safeFileName} - Baru: ${inserted.length}, Diperbarui: ${updated.length}, Dilewati: ${skipped.length}, Error: ${dbErrors.length}`,
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
