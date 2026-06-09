"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import type { DashboardStats, Transaksi, Barang } from "@/types";

interface KategoriStat { nama: string; total: number; }

const CHART_BARS = [40, 60, 45, 80, 65, 90, 55];
const DAYS       = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];

export default function AdminDashboard() {
  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [transaksi,   setTransaksi]   = useState<Transaksi[]>([]);
  const [barang,      setBarang]      = useState<Barang[]>([]);
  const [katStat,     setKatStat]     = useState<KategoriStat[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats").then(setStats);
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF")
      .then(d => setTransaksi(d.slice(0, 6)));
    api.get<Barang[]>("/api/barang").then(d => {
      setBarang(d);
      const map: Record<string, number> = {};
      d.forEach(b => { const k = b.kategori?.nama ?? "Lainnya"; map[k] = (map[k] ?? 0) + 1; });
      setKatStat(
        Object.entries(map)
          .map(([nama, total]) => ({ nama, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );
    });
  }, []);

  const tersedia   = barang.filter(b => b.status === "TERSEDIA").length;
  const dipinjam   = barang.filter(b => b.status === "DIPINJAM").length;
  const maintenance = barang.filter(b => b.status === "MAINTENANCE").length;
  const maxKat     = Math.max(...katStat.map(k => k.total), 1);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard Admin</h1>
        <p className="page-sub">{today} · FTI UKSW</p>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Aset",        value: stats?.totalBarang      ?? "—", icon: "ti-box",            href: "/admin/barang" },
          { label: "Dipinjam",          value: stats?.dipinjam         ?? "—", icon: "ti-arrows-exchange", href: "/admin/transaksi" },
          { label: "Pending Verifikasi",value: stats?.pendingVerifikasi ?? "—", icon: "ti-user-check",     href: "/admin/verifikasi" },
          { label: "Terlambat",         value: stats?.terlambat        ?? "—", icon: "ti-alert-circle",   href: "/admin/transaksi" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="glass stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
            </div>
            <div className="stat-value">{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Main body */}
      <div className="dash-body" style={{ marginBottom: 16 }}>

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
                <div className="empty-state" style={{ padding: "24px 0" }}>
                  <i className="ti ti-inbox" style={{ fontSize: 26 }} />Tidak ada peminjaman aktif
                </div>
              ) : transaksi.map(t => {
                const late = isOverdue(t.deadlineKembali);
                const soon = !late && isDueSoon(t.deadlineKembali);
                return (
                  <div key={t.id} className="list-item">
                    <div className="list-icon"><i className="ti ti-box" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.barang.nama}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {t.barang.kodeBarang} · {t.user.name ?? t.user.email}
                      </div>
                    </div>
                    <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}>
                      {late ? "Terlambat" : soon ? "Segera" : "Tepat Waktu"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistik per Kategori */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <div className="section-header">
              <span className="section-label">Distribusi per Kategori</span>
              <Link href="/admin/kategori" className="see-all">Detail →</Link>
            </div>
            {katStat.length === 0 ? (
              <div className="empty-state" style={{ padding: "16px 0" }}>Tidak ada data</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {katStat.map(k => (
                  <div key={k.nama} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nama}</div>
                    <div className="bar-track" style={{ flex: 1 }}>
                      <div className="bar-fill" style={{ width: `${Math.round((k.total / maxKat) * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 28, textAlign: "right", flexShrink: 0 }}>{k.total}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktivitas 7 hari */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <div className="section-header">
              <span className="section-label">Aktivitas 7 Hari</span>
              <span className="badge badge-ok">+18%</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
              {CHART_BARS.map((h, i) => (
                <div key={i} className={`chart-bar${i === 5 ? " active" : ""}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, paddingTop: 6 }}>
              {DAYS.map(d => (
                <div key={d} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{d}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status aset */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label" style={{ display: "block", marginBottom: 14 }}>Status Aset</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Tersedia",    val: tersedia,    color: "var(--color-ok)",   pct: barang.length ? Math.round((tersedia / barang.length) * 100) : 0 },
                { label: "Dipinjam",   val: dipinjam,    color: "var(--color-warn)",  pct: barang.length ? Math.round((dipinjam / barang.length) * 100) : 0 },
                { label: "Maintenance",val: maintenance, color: "var(--text-muted)",  pct: barang.length ? Math.round((maintenance / barang.length) * 100) : 0 },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.val}</span>
                  </div>
                  <div className="bar-track">
                    <div style={{ height: "100%", borderRadius: 10, width: `${item.pct}%`, background: item.color, transition: "width .4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User stat */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Pengguna Sistem</span>
            <div className="dash-summary" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "Total User",  value: stats?.totalUsers ?? 0,          color: "var(--ds-mist)" },
                { label: "Pending",     value: stats?.pendingVerifikasi ?? 0,   color: "var(--color-warn)" },
              ].map(item => (
                <div key={item.label} style={{ textAlign: "center", padding: "14px 8px", background: "rgba(65,90,119,0.15)", borderRadius: 12 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aksi cepat */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Aksi Cepat</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { href: "/admin/barang",     icon: "ti-plus",          label: "Tambah Barang" },
                { href: "/admin/verifikasi", icon: "ti-user-check",    label: "Verifikasi User" },
                { href: "/admin/transaksi",  icon: "ti-file-export",   label: "Export Laporan" },
                { href: "/admin/ruangan",    icon: "ti-building",      label: "Kelola Ruangan" },
              ].map(a => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <i className={`ti ${a.icon}`} style={{ color: "var(--ds-mist)", fontSize: 16, flexShrink: 0 }} />
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