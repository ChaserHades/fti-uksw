import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";

const navItems: NavItem[] = [
  { href: "/petugas/dashboard", label: "Dashboard",    icon: "ti-layout-dashboard" },
  { href: "/petugas/pinjam",    label: "Pinjam",       icon: "ti-arrow-bar-to-down" },
  { href: "/petugas/kembali",   label: "Kembalikan",   icon: "ti-arrow-bar-to-up" },
  { href: "/petugas/riwayat",   label: "Riwayat",      icon: "ti-history" },
];

export default async function PetugasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PETUGAS", "ADMIN");
  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <Topbar items={navItems} role="PETUGAS" userName={session.name} userEmail={session.email} />
      <main className="main-content">{children}</main>
    </div>
  );
}