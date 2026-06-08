// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email().refine(
    (e) => e.endsWith("@uksw.edu") || e.endsWith("@student.uksw.edu"),
    "Hanya email institusi UKSW"
  ),
  password: z.string().min(8),
  role: z.enum(["PETUGAS", "UNIVERSITAS"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role } = schema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, password: hash, role, statusVerifikasi: "PENDING" } });
    return NextResponse.json({ message: "Registrasi berhasil" });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
