import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";
import DynamicIsland, { IslandAction } from "@/components/DynamicIsland";

const navItems: NavItem[] = [
  { href: "/petugas/dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { href: "/petugas/manajemen?tab=pinjam", label: "Manajemen Aset", icon: "ti-arrows-exchange" },
];

const petugasIslandActions: IslandAction[] = [
  { id: "scan-qr", href: "/petugas/manajemen?tab=pinjam&action=scan", icon: "ti-qrcode", label: "Scan QR Peminjaman", color: "var(--color-ok)" },
  { id: "pindah-barang", href: "/petugas/manajemen?tab=barang&action=letak", icon: "ti-arrows-exchange", label: "Pindah Barang", color: "var(--color-warn)" },
  { id: "cek-barang", href: "/petugas/manajemen?tab=barang", icon: "ti-list-search", label: "Cek Ketersediaan", color: "var(--color-info)" },
  { id: "riwayat", href: "/petugas/manajemen?tab=riwayat", icon: "ti-history", label: "Riwayat Lengkap", color: "var(--text-secondary)" },
];

export default async function PetugasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TEKNISI", "ADMIN");
  return (
    <div className="ds-bg">
      <Topbar items={navItems} role="TEKNISI" userName={session.name} userEmail={session.email} />
      <DynamicIsland actions={petugasIslandActions} />
      <main className="main-content">{children}</main>
    </div>
  );
}