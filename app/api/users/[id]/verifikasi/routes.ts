// app/api/users/[id]/verifikasi/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { action } = body;
  if (action !== "APPROVE" && action !== "REJECT")
    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { statusVerifikasi: status },
      select: { id: true, name: true, email: true, statusVerifikasi: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
}