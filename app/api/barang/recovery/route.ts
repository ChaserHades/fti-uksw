import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { session, error } = await checkApiAuth();
  if (error) return error;

  const searchParams = new URL(req.url).searchParams;
  const kode = searchParams.get("kode") ?? "";

  if (!kode) {
    return NextResponse.json({ error: "Missing kode parameter" }, { status: 400 });
  }

  // 1. Try exact match by internal ID first
  let item = await prisma.barang.findUnique({
    where: { id: kode },
    include: { kategori: true, ruangan: true },
  });

  // 2. Fallback to legacy label match
  if (!item) {
    const legacyMatches = await prisma.barang.findMany({
      where: { label: kode },
      include: { kategori: true, ruangan: true },
    });

    if (legacyMatches.length === 1) {
      item = legacyMatches[0];
    } else if (legacyMatches.length > 1) {
      return NextResponse.json({ state: "AMBIGUOUS", message: "Beberapa aset menggunakan label legacy ini." });
    } else {
      // Case-insensitive fallback
      const fallbackMatches = await prisma.barang.findMany({
        where: { label: { equals: kode, mode: "insensitive" } },
        include: { kategori: true, ruangan: true },
      });

      if (fallbackMatches.length === 1) {
        item = fallbackMatches[0];
      } else if (fallbackMatches.length > 1) {
        return NextResponse.json({ state: "AMBIGUOUS", message: "Beberapa aset menggunakan label legacy ini." });
      }
    }
  }

  if (!item) {
    return NextResponse.json({ state: "NOT_FOUND" });
  }

  if (!item.deletedAt) {
    return NextResponse.json({ state: "ACTIVE", item });
  }

  const now = Date.now();
  const deletedAtTime = item.deletedAt.getTime();
  const deadline = deletedAtTime + 6 * 24 * 60 * 60 * 1000;

  if (now <= deadline) {
    return NextResponse.json({ state: "RECOVERABLE", item, deadline });
  } else {
    return NextResponse.json({ state: "EXPIRED", item });
  }
}
