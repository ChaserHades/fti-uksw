// app/admin/layout.tsx
import { requireRole } from "@/lib/auth";
import Sidebar, { NavItem } from "@/components/Sidebar";

const navItems: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",         icon: "ti-layout-dashboard" },
  { href: "/admin/kategori",   label: "Kategori Barang",   icon: "ti-category" },
  { href: "/admin/barang",     label: "Barang",            icon: "ti-box" },
  { href: "/admin/ruangan",    label: "Ruangan",           icon: "ti-building" },
  { href: "/admin/verifikasi", label: "Verifikasi User",   icon: "ti-user-check" },
  { href: "/admin/petugas",    label: "Petugas",           icon: "ti-users" },
  { href: "/admin/transaksi",  label: "Laporan Transaksi", icon: "ti-file-description" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Sidebar items={navItems} role="ADMIN" userName={session.name} userEmail={session.email} />
      <main className="main-content">{children}</main>
    </div>
  );
}
