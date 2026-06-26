import { requireRole } from "@/lib/auth";
import Topbar, { NavItem } from "@/components/Topbar";
import DynamicIsland, { IslandAction } from "@/components/DynamicIsland";

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { href: "/admin/manajemen?tab=barang", label: "Manajemen Aset", icon: "ti-box" },
  { href: "/admin/tim", label: "Tim & Verifikasi", icon: "ti-users" },
];

const adminIslandActions: IslandAction[] = [
  { id: "add-barang", href: "/admin/manajemen?tab=barang&action=add", icon: "ti-plus", label: "Tambah Barang", color: "var(--color-ok)" },
  { id: "scan-qr", href: "/admin/manajemen?tab=pinjam&action=scan", icon: "ti-qrcode", label: "Scan QR Peminjaman", color: "var(--color-info)" },
  { id: "kelola-ruangan", href: "/admin/manajemen?tab=ruangan", icon: "ti-building", label: "Kelola Letak", color: "var(--ds-mist)" },
  { id: "pengeluaran", href: "/admin/manajemen?tab=laporan&action=add", icon: "ti-file-description", label: "Input Pengeluaran", color: "var(--color-err)" },
  { id: "verifikasi", href: "/admin/tim", icon: "ti-user-check", label: "Verifikasi User", color: "var(--color-warn)" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <div className="ds-bg">
      <Topbar items={navItems} role="ADMIN" userName={session.name} userEmail={session.email} />
      <DynamicIsland actions={adminIslandActions} />
      <main className="main-content">{children}</main>
    </div>
  );
}