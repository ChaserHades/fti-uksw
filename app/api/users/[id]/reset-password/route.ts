import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session || (session.role !== "ADMIN" && session.role !== "SPV")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a random 8-character alphanumeric password
  const randomChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let randomPassword = "";
  for (let i = 0; i < 8; i++) {
    randomPassword += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }

  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  try {
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true, // Paksa user ganti password saat login
      },
    });

    return NextResponse.json({ 
      message: "Password berhasil di-reset.", 
      newPassword: randomPassword 
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json({ error: "Gagal mereset password user." }, { status: 500 });
  }
}
