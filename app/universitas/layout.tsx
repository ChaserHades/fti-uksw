import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";
import DynamicIsland, { IslandAction } from "@/components/DynamicIsland";

const navItems: NavItem[] = [
  { href: "/universitas/dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { href: "/universitas/manajemen?tab=barang", label: "Manajemen Aset", icon: "ti-box" },
];

const univIslandActions: IslandAction[] = [
  { id: "cek-barang", href: "/universitas/manajemen?tab=barang", icon: "ti-box", label: "Daftar Aset", color: "var(--color-info)" },
  { id: "cashflow", href: "/universitas/manajemen?tab=laporan", icon: "ti-receipt", label: "Laporan Cashflow", color: "var(--color-warn)" },
];

export default async function UniversitasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("UNIVERSITAS", "ADMIN");
  return (
    <div className="ds-bg">
      <Topbar items={navItems} role="UNIVERSITAS" userName={session.name} userEmail={session.email} />
      <DynamicIsland actions={univIslandActions} />
      <main className="main-content">{children}</main>
    </div>
  );
}