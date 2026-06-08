// app/page.tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getSession();
  // if (!session) redirect("/login");

  // if (session.statusVerifikasi === "PENDING") redirect("/pending");
  // if (session.statusVerifikasi === "REJECTED") redirect("/rejected");

  // if (session.role === "ADMIN") redirect("/admin/dashboard");
  // if (session.role === "PETUGAS") redirect("/petugas/dashboard");
  // if (session.role === "UNIVERSITAS") redirect("/universitas/dashboard");

  redirect("/login");
}
