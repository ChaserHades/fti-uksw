import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.statusVerifikasi === "PENDING") redirect("/pending");
  if (session.statusVerifikasi === "REJECTED") redirect("/rejected");
  if (session.mustChangePassword) redirect("/force-change-password");
  return session;
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.role)) redirect("/unauthorized");
  return session;
}

export async function checkApiAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (session.statusVerifikasi !== "APPROVED") {
    return { error: NextResponse.json({ error: "Akun belum diverifikasi (Pending/Rejected)" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
