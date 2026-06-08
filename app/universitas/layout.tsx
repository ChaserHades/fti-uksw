// app/universitas/layout.tsx
import { requireRole } from "@/lib/auth";
import Sidebar, { NavItem } from "@/components/Sidebar";

const navItems: NavItem[] = [
  { href: "/universitas/dashboard",  label: "Dashboard",       icon: "ti-layout-dashboard" },
  { href: "/universitas/barang",     label: "Daftar Aset",     icon: "ti-box" },
  { href: "/universitas/transaksi",  label: "Laporan Pinjam",  icon: "ti-file-description" },
];

export default async function UniversitasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("UNIVERSITAS", "ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Sidebar
        items={navItems}
        role="UNIVERSITAS"
        userName={session.name}
        userEmail={session.email}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
