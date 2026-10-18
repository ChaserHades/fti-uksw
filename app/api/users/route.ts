// app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { session, error: authError } = await checkApiAuth();
  if (authError) return authError;
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam === "all" ? undefined : parseInt(limitParam || "50", 10);
  const cursor = searchParams.get("cursor");

  const users = await prisma.user.findMany({
    take: limit !== undefined ? limit + 1 : undefined,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true,
      role: true, statusVerifikasi: true, createdAt: true,
      mustChangePassword: true,
    },
  });

  let nextCursor: string | null = null;
  if (limit !== undefined && users.length > limit) {
    const nextItem = users.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({ data: users, nextCursor });
}

