// app/api/jenis-barang/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const list = await prisma.jenisBarang.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.jenisBarang.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
