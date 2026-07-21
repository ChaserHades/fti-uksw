import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as xlsx from "xlsx";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "TEKNISI")) {
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
    const data = await prisma.peminjaman.findMany({
      where,
      include: {
        barang: { include: { ruangan: true, kategori: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" }
    });

    // Format data for export
    const rows = data.map((t, i) => ({
      NO: i + 1,
      BARANG: t.barang?.kategori?.nama || "-",
      "LABEL BARANG": t.barang?.label || "-",
      PEMINJAM: t.namaPeminjam,
      "RUANGAN TUJUAN": t.ruanganTujuan,
      "TANGGAL PINJAM": t.createdAt ? new Date(t.createdAt).toLocaleString("id-ID") : "-",
      "DEADLINE KEMBALI": t.deadlineKembali ? new Date(t.deadlineKembali).toLocaleDateString("id-ID") : "-",
      "TANGGAL KEMBALI": t.tanggalKembali ? new Date(t.tanggalKembali).toLocaleString("id-ID") : "-",
      STATUS: t.status,
      KETERANGAN: t.terlambat ? "Terlambat" : (t.status === "AKTIF" ? "Aktif" : "Selesai"),
      CATATAN: t.catatan || "-",
      DIPROSES_OLEH: t.user?.name || "-"
    }));

    if (format === "csv") {
      const worksheet = xlsx.utils.json_to_sheet(rows);
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="Export_Riwayat_Peminjaman.csv"'
        }
      });
    } else {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, worksheet, "Riwayat Peminjaman");
      
      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="Export_Riwayat_Peminjaman.xlsx"'
        }
      });
    }

  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Gagal memproses export" }, { status: 500 });
  }
}
