"use server";

import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["PETUGAS", "UNIVERSITAS"]),
});

export async function loginAction(formData: FormData) {
  const raw = {
    email:    formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: "Email atau password tidak valid" };

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return { error: "Email atau password salah" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Email atau password salah" };

  await createSession({
    id:               user.id,
    email:            user.email,
    name:             user.name ?? "",
    role:             user.role,
    statusVerifikasi: user.statusVerifikasi,
  });

  if (user.statusVerifikasi === "PENDING")  redirect("/pending");
  if (user.statusVerifikasi === "REJECTED") redirect("/rejected");
  if (user.role === "ADMIN")       redirect("/admin/dashboard");
  if (user.role === "PETUGAS")     redirect("/petugas/dashboard");
  if (user.role === "UNIVERSITAS") redirect("/universitas/dashboard");
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const raw = {
    name:     formData.get("name") as string,
    email:    formData.get("email") as string,
    password: formData.get("password") as string,
    role:     formData.get("role") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email sudah terdaftar" };

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, password: hash, role, statusVerifikasi: "PENDING" },
  });

  return { success: "Registrasi berhasil! Menunggu verifikasi admin." };
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}