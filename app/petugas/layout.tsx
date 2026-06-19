import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";

const navItems: NavItem[] = [
  { href: "/petugas/dashboard",  label: "Dashboard",       icon: "ti-layout-dashboard" },
  { href: "/petugas/pinjam",     label: "Pinjam/ Kembali", icon: "ti-arrows-exchange" },
  { href: "/petugas/ruangan",    label: "Ruangan",         icon: "ti-building" },
  { href: "/petugas/listbarang", label: "Cek Barang",      icon: "ti-list-search" },
  { href: "/petugas/riwayat",    label: "Riwayat",         icon: "ti-history" },
];

export default async function PetugasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TEKNISI", "ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Topbar items={navItems} role="TEKNISI" userName={session.name} userEmail={session.email} />
      <main className="main-content">{children}</main>
    </div>
  );
}