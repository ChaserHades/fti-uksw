import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";

const navItems: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",        icon: "ti-layout-dashboard" },
  { href: "/admin/barang",     label: "Barang",           icon: "ti-box" },
  { href: "/admin/ruangan",    label: "Ruangan",          icon: "ti-building" },
  { href: "/admin/pinjam",     label: "Pinjam",           icon: "ti-qrcode" },
  { href: "/admin/riwayat",    label: "Riwayat",          icon: "ti-history" },
  { href: "/admin/laporan",    label: "Laporan",          icon: "ti-file-description" },
  { href: "/admin/tim",        label: "Tim & Verifikasi", icon: "ti-users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Topbar items={navItems} role="ADMIN" userName={session.name} userEmail={session.email} />
      <main className="main-content">{children}</main>
    </div>
  );
}