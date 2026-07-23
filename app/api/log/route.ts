import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  
  if (!session || (session.role !== "ADMIN" && session.role !== "TEKNISI")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Jika Teknisi, hanya bisa melihat log milik sesama Teknisi
    // (dan otomatis tidak akan melihat PENGELUARAN karena itu milik Admin)
    const whereClause: any = session.role === "TEKNISI" 
      ? { user: { role: "TEKNISI" } } 
      : {};

    const logs = await prisma.logAktivitas.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to recent 100 for performance
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengambil log aktivitas" }, { status: 500 });
  }
}
