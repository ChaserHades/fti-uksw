// app/admin/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import type { DashboardStats, Transaksi } from "@/types";

const CHART_BARS = [40, 60, 45, 80, 65, 90, 55];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then(setStats);
    fetch("/api/transaksi?status=AKTIF")
      .then((r) => r.json())
      .then((d: Transaksi[]) => setTransaksi(d.slice(0, 5)));
  }, []);

  return (
    <>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Selamat datang, Admin</h1>
        <p className="page-sub">{today} · FTI UKSW</p>
      </div>

      {/* Stat Cards — grid-4 → 2col @1100px → 1col @640px */}
      <div className="grid-4" style={{ marginBottom: 18 }}>
        <StatCard
          label="Total Aset" value={stats?.totalBarang ?? "—"}
          icon="ti-box" delta="Semua barang terdaftar" badge="Aktif" badgeClass="badge-ok"
        />
        <StatCard
          label="Dipinjam" value={stats?.dipinjam ?? "—"}
          icon="ti-arrows-exchange" delta="Transaksi aktif" badge="Live" badgeClass="badge-info"
        />
        <StatCard
          label="Pending Verifikasi" value={stats?.pendingVerifikasi ?? "—"}
          icon="ti-user-check" delta="Menunggu approval" badge="Pending" badgeClass="badge-warn"
        />
        <StatCard
          label="Terlambat" value={stats?.terlambat ?? "—"}
          icon="ti-alert-circle" delta="Perlu tindakan" badge="Alert" badgeClass="badge-danger"
        />
      </div>

      {/* Body — dash-body: 1fr+320px → 1col @1100px */}
      <div className="dash-body">

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Active loans */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Peminjaman Aktif</span>
                <Link href="/admin/transaksi" className="see-all">Lihat semua →</Link>
              </div>
            </div>
            <div style={{ padding: "0 20px 12px" }}>
              {transaksi.length === 0 ? (
                <div className="empty-state" style={{ padding: "28px 0" }}>
                  <i className="ti ti-inbox" style={{ fontSize: 28 }} />
                  Tidak ada peminjaman aktif
                </div>
              ) : transaksi.map((t) => {
                const late = isOverdue(t.deadlineKembali);
                const soon = !late && isDueSoon(t.deadlineKembali);
                return (
                  <div key={t.id} className="list-item">
                    <div className="list-icon">
                      <i className="ti ti-device-laptop" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                        {t.barang.nama}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {t.barang.kodeBarang} · {t.user.name ?? t.user.email}
                      </div>
                    </div>
                    <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}
                      style={{ flexShrink: 0 }}>
                      {late ? "Terlambat" : soon ? "Besok Deadline" : "Tepat Waktu"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini chart */}
          <div className="glass" style={{ padding: "16px 20px" }}>
            <div className="section-header">
              <span className="section-label">Aktivitas 7 Hari</span>
              <span className="badge badge-ok">+18%</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
              {CHART_BARS.map((h, i) => (
                <div
                  key={i}
                  className={`chart-bar${i === 5 ? " active" : ""}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, paddingTop: 6 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* User summary */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label">User Terdaftar</span>
            <div className="stat-value" style={{ margin: "8px 0 14px" }}>
              {stats?.totalUsers ?? "—"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Total",   val: stats?.totalUsers ?? 0,         pct: 100 },
                {
                  label: "Pending",
                  val: stats?.pendingVerifikasi ?? 0,
                  pct: stats?.totalUsers
                    ? Math.round(((stats.pendingVerifikasi) / stats.totalUsers) * 100)
                    : 0,
                },
              ].map(({ label, val, pct }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 52 }}>{label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 24, textAlign: "right" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label">Aksi Cepat</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
              {[
                { href: "/admin/barang",     icon: "ti-plus",        label: "Tambah Barang" },
                { href: "/admin/kategori",   icon: "ti-category",    label: "Kelola Kategori" },
                { href: "/admin/verifikasi", icon: "ti-user-check",  label: "Verifikasi User" },
                { href: "/admin/transaksi",  icon: "ti-file-export", label: "Export Laporan" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <i className={`ti ${a.icon}`} style={{ color: "var(--ds-mist)", fontSize: 16 }} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}