import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";
import QRCode from "qrcode";

export async function POST(req: Request) {
  try {
    const { error: authError } = await checkApiAuth();
    if (authError) return authError;

    const body = await req.json();
    const mode = body.mode || "SELECTED";
    const ids = body.ids || [];

    let whereClause = {};

    if (mode === "ALL") {
      // No filter needed, fetch all
    } else if (mode === "TODAY") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      whereClause = { createdAt: { gte: startOfToday } };
    } else if (mode === "NOT_PRINTED") {
      whereClause = { hasSticker: false };
    } else if (mode === "SELECTED") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "No ids provided" }, { status: 400 });
      }
      whereClause = { id: { in: ids } };
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const barangs = await prisma.barang.findMany({
      where: whereClause,
      select: { id: true, label: true, labelAset: true }
    });

    if (barangs.length === 0) {
      return NextResponse.json({ error: "No data found for the selected option" }, { status: 404 });
    }

    // Generate QR code data URLs for all requested items
    const results = await Promise.all(
      barangs.map(async (b) => {
        const payload = JSON.stringify({
          id: b.id,
          kode: b.labelAset || b.label,
        });
        const qrCode = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
        return {
          id: b.id,
          kode: b.labelAset || b.label,
          qrCode
        };
      })
    );


    if (mode === "NOT_PRINTED") {
      const generatedIds = barangs.map(b => b.id);
      await prisma.barang.updateMany({
        where: { id: { in: generatedIds } },
        data: { hasSticker: true }
      });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
