// app/api/barang/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface RowData {
  kodeBarang: string;
  nama: string;
  serialNumber?: string;
  merek?: string;
  tipe?: string;
  kategori: string;
  ruangan?: string;
  kondisi: string;
  jumlah: number;
  tanggalBeli?: Date;
  harga?: number;
  vendor?: string;
  deskripsi?: string;
}

function parseCSV(text: string): RowData[] {
  // Dukung delimiter titik koma atau koma
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Ambil header dan ubah jadi lowercase tanpa spasi berlebih
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  const rows: RowData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });

    // Lewati baris kosong
    if (!row["jenis barang"] && !row["label"] && !row.kodebarang && !row.nama) continue;

    // --- Pemetaan Kolom Riil ---
    const kode = row.label || row.kodebarang || row.kode || "";
    const kategoriRaw = row["jenis barang"] || row.kategori || "Lainnya";
    const merek = row.merek || row.merk || "";
    const modelRaw = row.model || "";
    const typeRaw = row.type || row.tipe || "";
    const tipe = [modelRaw, typeRaw].filter(Boolean).join(" - ");
    
    // Fallback nama: jika tidak ada 'nama', susun dari Kategori, Merek, Tipe
    let nama = row.nama || "";
    if (!nama) {
      nama = [kategoriRaw, merek, tipe].filter(Boolean).join(" ");
    }
    if (!nama) nama = "Aset Tidak Bernama";

    // Keterangan / Deskripsi / Kondisi
    const ket = (row.keterangan || row.deskripsi || "").toLowerCase();
    let kondisi = "BAIK";
    if (ket.includes("rusak berat")) kondisi = "RUSAK_BERAT";
    else if (ket.includes("rusak")) kondisi = "RUSAK_RINGAN";
    else if (row.kondisi) {
      const k = row.kondisi.toLowerCase();
      if (k.includes("berat")) kondisi = "RUSAK_BERAT";
      else if (k.includes("rusak")) kondisi = "RUSAK_RINGAN";
    }

    // Harga
    let hargaVal: number | undefined = undefined;
    const hargaStr = row.harga;
    if (hargaStr) {
      const clean = hargaStr.replace(/rp/ig, "").replace(/\./g, "").replace(/,00/g, "").replace(/\s/g, "");
      const num = parseFloat(clean);
      if (!isNaN(num)) hargaVal = num;
    }

    // Tanggal
    let tanggalVal: Date | undefined = undefined;
    const tglStr = row.tanggal || row.tahunbeli;
    if (tglStr) {
      // Parse DD/MM/YYYY atau DD-MM-YYYY
      const parts = tglStr.split(/[-/]/);
      if (parts.length === 3) {
        // DD/MM/YYYY
        tanggalVal = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
      } else if (tglStr.length === 4) {
        // Just Year
        tanggalVal = new Date(`${tglStr}-01-01T00:00:00.000Z`);
      }
    }

    rows.push({
      kodeBarang: kode,
      nama: nama,
      serialNumber: row.sn || row.serialnumber || undefined,
      merek: merek || undefined,
      tipe: tipe || undefined,
      kategori: kategoriRaw,
      ruangan: row.letak || row.ruangan || undefined,
      kondisi: kondisi,
      jumlah: parseInt(row.jumlah ?? "1") || 1,
      tanggalBeli: tanggalVal,
      harga: hargaVal,
      vendor: row.vendor || undefined,
      deskripsi: row.keterangan || row.deskripsi || undefined,
    });
  }
  return rows;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0)
    return NextResponse.json({ error: "File kosong atau format tidak valid. Kolom wajib: kodeBarang, nama" }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      // Check duplicate
      const existing = await prisma.barang.findUnique({ where: { kodeBarang: row.kodeBarang } });
      if (existing) { skipped++; continue; }

      // Resolve kategori — upsert
      const kat = await prisma.kategoriBarang.upsert({
        where: { nama: row.kategori },
        update: {},
        create: { nama: row.kategori },
      });

      // Resolve ruangan - case insensitive check
      let ruanganId: string | null = null;
      if (row.ruangan) {
        let rn = await prisma.ruangan.findFirst({
          where: { 
            OR: [
              { kode: { equals: row.ruangan, mode: "insensitive" } }, 
              { nama: { equals: row.ruangan, mode: "insensitive" } }
            ] 
          },
        });
        
        // Sesuai revisi: jika ruangan tidak ditemukan, biarkan null dan JANGAN auto-create
        if (rn) {
          ruanganId = rn.id;
        }
      }

      await prisma.barang.create({
        data: {
          kodeBarang: row.kodeBarang,
          nama: row.nama,
          serialNumber: row.serialNumber,
          merek: row.merek,
          tipe: row.tipe,
          vendor: row.vendor,
          deskripsi: row.deskripsi || null,
          kondisi: row.kondisi as "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT",
          jumlah: row.jumlah,
          tanggalBeli: row.tanggalBeli,
          harga: row.harga,
          kategoriId: kat.id,
          ruanganId,
        },
      });
      imported++;
    } catch (e) {
      errors.push(`${row.kodeBarang}: ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  return NextResponse.json({ imported, skipped, errors, total: rows.length });
}
