import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

import { assessBarangIdentity } from "@/lib/barang-identity";

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
      let itemIdentifier = "Tanpa Identitas";

      try {
        if (row.conflictError) {
          throw new Error(row.conflictError);
        }
        const identity = assessBarangIdentity(row);
        if (!identity.isValid) {
          throw new Error(identity.error || "Data tidak valid");
        }
        
        const norm = identity.normalizedData;
        itemIdentifier = norm.namaBarang || norm.label || norm.labelAset || "Tanpa Nama";
        const hasSticker = !!(norm.label || norm.labelAset || norm.sn);

        let kategoriId: string;
        if (norm.kategori) {
          let kategori = await prisma.kategori.findUnique({ where: { nama: norm.kategori } });
          if (!kategori) {
            kategori = await prisma.kategori.create({ data: { nama: norm.kategori } });
          }
          kategoriId = kategori.id;
        } else {
          // If valid anchor but empty category
          let kategori = await prisma.kategori.findUnique({ where: { nama: "Belum Dikategorikan" } });
          if (!kategori) {
            kategori = await prisma.kategori.create({ data: { nama: "Belum Dikategorikan" } });
          }
          kategoriId = kategori.id;
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

        // Conservative Duplicate Matching
        // Never auto-merge on 'namaBarang' alone. Need at least label, labelAset, or sn.
        let existingBarang = null;
        
        if (norm.label || norm.labelAset || norm.sn) {
          const conditions: any = {};
          if (norm.label) conditions.label = norm.label;
          if (norm.labelAset) conditions.labelAset = norm.labelAset;
          if (norm.sn) conditions.sn = norm.sn;
          if (norm.namaBarang) conditions.namaBarang = norm.namaBarang; // strengthen if available

          const possibleMatches = await prisma.barang.findMany({
            where: conditions
          });
          
          const availableMatches = possibleMatches.filter(m => !usedDbIds.has(m.id));
          
          if (availableMatches.length === 1) {
             existingBarang = availableMatches[0];
          } else if (availableMatches.length > 1) {
             throw new Error("Ambigu: Terdapat beberapa barang dengan identitas yang sama, gagal merge otomatis.");
          }
        }
        
        if (existingBarang) {
          usedDbIds.add(existingBarang.id);
        }

        let kondisi = row.kondisi || "BAIK";
        const ketLower = (row.keterangan || "").toLowerCase();
        if (ketLower.includes("rusak berat")) kondisi = "RUSAK_BERAT";
        else if (ketLower.includes("rusak")) kondisi = "RUSAK_RINGAN";

        if (existingBarang) {
          if (isUpdateMode) {
            // Cek perubahan data
            const dtDatangExcel = row.tanggalDatang ? new Date(row.tanggalDatang).getTime() : null;
            const dtDatangDB = existingBarang.tanggalDatang ? existingBarang.tanggalDatang.getTime() : null;
            
            const dtPindahExcel = row.tanggalPindah ? new Date(row.tanggalPindah).getTime() : null;
            const dtPindahDB = existingBarang.tanggalPindah ? existingBarang.tanggalPindah.getTime() : null;

            const isChanged =
              existingBarang.merek !== norm.merek ||
              existingBarang.model !== (row.model || null) ||
              existingBarang.tipe !== (row.tipe || null) ||
              existingBarang.vendor !== (row.vendor || null) ||
              existingBarang.keterangan !== (row.keterangan || null) ||
              existingBarang.kondisi !== kondisi ||
              existingBarang.ruanganId !== ruanganId ||
              existingBarang.kategoriId !== kategoriId ||
              existingBarang.harga !== (row.harga || null) ||
              existingBarang.sumberTahun !== (row.sumberTahun || null) ||
              existingBarang.label !== norm.label ||
              existingBarang.labelAset !== norm.labelAset ||
              existingBarang.sn !== (norm.sn || null) ||
              existingBarang.namaBarang !== norm.namaBarang ||
              dtDatangDB !== dtDatangExcel ||
              dtPindahDB !== dtPindahExcel;

            if (!isChanged) {
              skipped.push(itemIdentifier);
            } else {
              await prisma.barang.update({
                where: { id: existingBarang.id },
                data: {
                  namaBarang: norm.namaBarang,
                  merek: norm.merek,
                  model: row.model || null,
                  tipe: row.tipe || null,
                  vendor: row.vendor || null,
                  keterangan: row.keterangan || null,
                  kondisi: kondisi as any,
                  ruanganId: ruanganId,
                  kategoriId: kategoriId,
                  harga: row.harga || null,
                  sumberTahun: row.sumberTahun || null,
                  label: norm.label,
                  labelAset: norm.labelAset,
                  sn: norm.sn || null,
                  tanggalDatang: norm.tanggalDatang,
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
              namaBarang: norm.namaBarang,
              label: norm.label,
              labelAset: norm.labelAset,
              sn: norm.sn || null,
              merek: norm.merek,
              model: row.model || null,
              tipe: row.tipe || null,
              vendor: row.vendor || null,
              keterangan: row.keterangan || null,
              kondisi: kondisi as any,
              status: "TERSEDIA",
              jumlah: 1,
              hasSticker: hasSticker,
              ruanganId: ruanganId,
              kategoriId: kategoriId,
              tanggalDatang: norm.tanggalDatang,
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
