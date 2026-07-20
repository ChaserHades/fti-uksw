// app/api/ruangan/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const includeCount = searchParams.get("include") === "count";
  const search = searchParams.get("search") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam === "all" ? undefined : parseInt(limitParam || "50", 10);
  const cursor = searchParams.get("cursor");

  const list = await prisma.ruangan.findMany({
    take: limit !== undefined ? limit + 1 : undefined,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: search ? {
      OR: [
        { nama: { contains: search, mode: "insensitive" } },
        { kode: { contains: search, mode: "insensitive" } },
      ]
    } : {},
    orderBy: { kode: "asc" },
    ...(includeCount ? { include: { _count: { select: { barang: true } } } } : {}),
  });

  let nextCursor: string | null = null;
  if (limit !== undefined && list.length > limit) {
    const nextItem = list.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({ data: list, nextCursor });
}

export async function POST(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.ruangan.create({
    data: {
      kode: body.kode,
      nama: body.nama,
      lantai: body.lantai ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
