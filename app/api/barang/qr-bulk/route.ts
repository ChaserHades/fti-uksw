import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import QRCode from "qrcode";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const barangs = await prisma.barang.findMany({
      where: { id: { in: ids } },
      select: { id: true, label: true, nama: true }
    });

    // Generate QR code data URLs for all requested items
    const results = await Promise.all(
      barangs.map(async (b) => {
        const payload = JSON.stringify({
          id: b.id,
          kode: b.label,
          nama: b.nama,
        });
        const qrCode = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
        return {
          id: b.id,
          kode: b.label,
          nama: b.nama,
          qrCode
        };
      })
    );

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
