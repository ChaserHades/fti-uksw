// app/api/barang/[id]/qr/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import QRCode from "qrcode";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const barang = await prisma.barang.findUnique({ where: { id } });
  if (!barang) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = JSON.stringify({
    id: barang.id,
    kode: barang.labelAset || barang.label,
  });

  const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
  await prisma.barang.update({ where: { id }, data: { qrCode: qrDataUrl } });

  return NextResponse.json({ qrCode: qrDataUrl, kode: barang.label });
}
