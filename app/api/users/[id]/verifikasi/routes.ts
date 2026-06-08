// app/api/users/[id]/verifikasi/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action } = await req.json();
  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const user = await prisma.user.update({
    where: { id },
    data: { statusVerifikasi: status },
    select: { id: true, name: true, email: true, statusVerifikasi: true },
  });
  return NextResponse.json(user);
}
