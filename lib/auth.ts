// lib/auth.ts
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.statusVerifikasi === "PENDING") redirect("/pending");
  if (session.statusVerifikasi === "REJECTED") redirect("/rejected");
  return session;
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.role)) redirect("/unauthorized");
  return session;
}
