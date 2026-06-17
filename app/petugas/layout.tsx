import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";

const navItems: NavItem[] = [
  { href: "/petugas/dashboard",  label: "Dashboard",       icon: "ti-layout-dashboard" },
  { href: "/petugas/pinjam",     label: "Pinjam/ Kembali", icon: "ti-arrows-exchange" },
  // { href: "/petugas/kembali",    label: "Kembalikan",   icon: "ti-arrow-bar-to-up" },
  { href: "/petugas/listbarang", label: "Cek Barang",      icon: "ti-list-search" },
  { href: "/petugas/riwayat",    label: "Riwayat",         icon: "ti-history" },
];

export default async function PetugasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PETUGAS", "ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Topbar items={navItems} role="PETUGAS" userName={session.name} userEmail={session.email} />
      <main className="main-content">{children}</main>
    </div>
  );
}