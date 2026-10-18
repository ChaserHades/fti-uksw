import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import * as xlsx from "xlsx";

export async function GET(req: Request) {
  const { session, error: authError } = await checkApiAuth();
  if (authError) return authError;
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
  const mode = searchParams.get("mode") || "ALL";

  // Base query
  const where: any = {};
  
  if (mode === "TODAY") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.createdAt = { gte: today };
  }

  try {
    const data = await prisma.pengeluaran.findMany({
      where,
      orderBy: { tanggal: "desc" }
    });

    // Format data for export
    const rows = data.map((t, i) => ({
      NO: i + 1,
      KODE: t.id.slice(-6).toUpperCase(), // or use the generated code if you store it
      TANGGAL: t.tanggal ? new Date(t.tanggal).toLocaleDateString("id-ID") : "-",
      JUDUL: t.judul,
      "PEMBELIAN KE": t.pembelianKe || "-",
      JENIS: t.jenis,
      NOMINAL: t.nominal,
      KETERANGAN: t.deskripsi || "-"
    }));

    if (format === "csv") {
      const worksheet = xlsx.utils.json_to_sheet(rows);
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="Export_Laporan_Keuangan.csv"'
        }
      });
    } else {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(rows);
      
      // Auto adjust widths (basic)
      const max_width = rows.reduce((w, r) => Math.max(w, String(r.JUDUL).length), 10);
      worksheet["!cols"] = [ { wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: max_width }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 } ];
      
      xlsx.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
      
      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="Export_Laporan_Keuangan.xlsx"'
        }
      });
    }

  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Gagal memproses export" }, { status: 500 });
  }
}
