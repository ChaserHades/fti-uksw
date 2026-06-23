// app/api/barang/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface RowData {
  kodeBarang: string;
  nama: string;
  kategori: string;
  ruangan?: string;
  kondisi?: string;
  jumlah?: string;
  tahunBeli?: string;
  harga?: string;
  deskripsi?: string;
}

function parseCSV(text: string): RowData[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: RowData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });

    if (!row.kodebarang && !row.kode) continue;
    if (!row.nama) continue;

    rows.push({
      kodeBarang: row.kodebarang || row.kode || "",
      nama:       row.nama,
      kategori:   row.kategori || "Lainnya",
      ruangan:    row.ruangan || row.ruanganid || undefined,
      kondisi:    row.kondisi || "BAIK",
      jumlah:     row.jumlah || "1",
      tahunBeli:  row.tahunbeli || row.tahun || undefined,
      harga:      row.harga || undefined,
      deskripsi:  row.deskripsi || row.keterangan || undefined,
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

      // Resolve ruangan if provided
      let ruanganId: string | null = null;
      if (row.ruangan) {
        let rn = await prisma.ruangan.findFirst({
          where: { OR: [{ kode: row.ruangan }, { nama: row.ruangan }] },
        });
        
        // Sesuai revisi: jika ruangan tidak ditemukan, biarkan null dan JANGAN auto-create
        if (rn) {
          ruanganId = rn.id;
        }
      }

      const kondisiMap: Record<string, string> = {
        baik: "BAIK", rusak_ringan: "RUSAK_RINGAN", rusak_berat: "RUSAK_BERAT",
        "rusak ringan": "RUSAK_RINGAN", "rusak berat": "RUSAK_BERAT",
      };
      const kondisi = kondisiMap[row.kondisi?.toLowerCase() ?? "baik"] ?? "BAIK";

      await prisma.barang.create({
        data: {
          kodeBarang: row.kodeBarang,
          nama: row.nama,
          deskripsi: row.deskripsi || null,
          kondisi: kondisi as "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT",
          jumlah: parseInt(row.jumlah ?? "1") || 1,
          tahunBeli: row.tahunBeli ? parseInt(row.tahunBeli) : null,
          harga: row.harga ? parseFloat(row.harga) : null,
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
