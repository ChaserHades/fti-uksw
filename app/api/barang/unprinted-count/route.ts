import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { error: authError } = await checkApiAuth();
    if (authError) return authError;

    const count = await prisma.barang.count({
      where: {
        hasSticker: false
      }
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
