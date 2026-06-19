// app/api/ruangan/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeCount = searchParams.get("include") === "count";

  const list = await prisma.ruangan.findMany({
    orderBy: { kode: "asc" },
    ...(includeCount ? { include: { _count: { select: { barang: true } } } } : {}),
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.ruangan.create({
    data: {
      kode: body.kode,
      nama: body.nama,
      gedung: body.gedung ?? null,
      lantai: body.lantai ?? null,
      kapasitas: body.kapasitas ? Number(body.kapasitas) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
