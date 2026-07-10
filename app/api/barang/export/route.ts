import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as xlsx from "xlsx";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
  const type = searchParams.get("type") || "all";
  
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  // Build Query
  const where: any = {};
  if (type === "filter") {
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { labelAset: { contains: search, mode: "insensitive" } },
        { sn: { contains: search, mode: "insensitive" } },
        { nama: { contains: search, mode: "insensitive" } },
        { merek: { contains: search, mode: "insensitive" } }
      ];
    }
    
    const kategoriId = searchParams.get("kategoriId");
    if (kategoriId) where.kategoriId = kategoriId;
    
    const vendor = searchParams.get("vendor");
    if (vendor) where.vendor = { contains: vendor, mode: "insensitive" };

    const ruangan = searchParams.get("ruangan");
    if (ruangan) {
      where.ruangan = {
        kode: { contains: ruangan, mode: "insensitive" }
      };
    }
  }

  // Handle Sort Order relation
  let orderBy: any = {};
  if (sortBy === "kategori") {
    orderBy = { kategori: { nama: sortDir } };
  } else if (sortBy === "ruangan") {
    orderBy = { ruangan: { kode: sortDir } };
  } else {
    orderBy = { [sortBy]: sortDir };
  }

  try {
    const data = await prisma.barang.findMany({
      where,
      orderBy,
      include: {
        kategori: true,
        ruangan: true
      }
    });

    const workbook = xlsx.utils.book_new();

    // Group data by sumberTahun
    const groupedData: Record<string, typeof data> = {};
    for (const b of data) {
      const year = b.sumberTahun || "Tanpa Tahun";
      if (!groupedData[year]) groupedData[year] = [];
      groupedData[year].push(b);
    }

    if (Object.keys(groupedData).length === 0) {
      const emptySheet = xlsx.utils.json_to_sheet([{ Message: "Tidak ada data" }]);
      xlsx.utils.book_append_sheet(workbook, emptySheet, "Data Kosong");
    }

    // Process each year group into its own sheet
    for (const [year, items] of Object.entries(groupedData)) {
      const rows = items.map((b, i) => ({
        NO: i + 1,
        "KATEGORI": b.kategori.nama,
        LABEL: b.label || "",
        SN: b.sn || "",
        "LABEL ASET": b.labelAset || "",
        MERK: b.merek || "",
        MODEL: b.model || "",
        TYPE: b.tipe || "",
        RUANGAN: b.ruangan?.kode || "",
        KETERANGAN: b.keterangan || "",
        VENDOR: b.vendor || "",
        HARGA: b.harga || "",
        TANGGALDATANG: b.tanggalDatang ? b.tanggalDatang.toISOString().split("T")[0] : "",
        TANGGALPINDAH: b.tanggalPindah ? b.tanggalPindah.toISOString().split("T")[0] : ""
      }));

      const worksheet = xlsx.utils.json_to_sheet(rows);
      // Valid sheet names in Excel are up to 31 chars and no invalid chars. `year` string should be fine.
      xlsx.utils.book_append_sheet(workbook, worksheet, String(year).substring(0, 31));
    }

    if (format === "csv") {
      // CSV only supports 1 sheet. We'll dump the first sheet or aggregate all.
      // Easiest is to combine all for CSV.
      const allRows = data.map((b, i) => ({
        NO: i + 1,
        "KATEGORI": b.kategori.nama,
        LABEL: b.label || "",
        SN: b.sn || "",
        "LABEL ASET": b.labelAset || "",
        MERK: b.merek || "",
        MODEL: b.model || "",
        TYPE: b.tipe || "",
        RUANGAN: b.ruangan?.kode || "",
        KETERANGAN: b.keterangan || "",
        VENDOR: b.vendor || "",
        HARGA: b.harga || "",
        TANGGALDATANG: b.tanggalDatang ? b.tanggalDatang.toISOString().split("T")[0] : "",
        TANGGALPINDAH: b.tanggalPindah ? b.tanggalPindah.toISOString().split("T")[0] : ""
      }));
      const singleWs = xlsx.utils.json_to_sheet(allRows);
      const csv = xlsx.utils.sheet_to_csv(singleWs);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="Export.csv"'
        }
      });
    } else {
      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="Export.xlsx"'
        }
      });
    }

  } catch (error) {
    return NextResponse.json({ error: "Gagal memproses export" }, { status: 500 });
  }
}
