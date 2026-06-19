"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import { SkeletonCard, SkeletonTable } from "@/components/LoadingSkeleton";
import type { DashboardStats, Transaksi, Barang } from "@/types";

interface KategoriStat { nama: string; total: number; }

export default function AdminDashboard() {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [katStat,   setKatStat]   = useState<KategoriStat[]>([]);
  const [statusStat,setStatusStat]= useState({ tersedia: 0, dipinjam: 0, maintenance: 0, total: 0 });
  const [loaded,    setLoaded]    = useState(false);
  const hasFetched = useRef(false);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    Promise.all([
      api.get<DashboardStats>("/api/dashboard/stats"),
      api.get<Transaksi[]>("/api/transaksi?status=AKTIF"),
      api.get<Barang[]>("/api/barang"),
    ]).then(([s, t, b]) => {
      setStats(s);
      setTransaksi(t.slice(0, 6));

      const map: Record<string, number> = {};
      b.forEach(br => { const k = br.kategori?.nama ?? "Lainnya"; map[k] = (map[k] ?? 0) + 1; });
      setKatStat(
        Object.entries(map)
          .map(([nama, total]) => ({ nama, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );

      setStatusStat({
        tersedia:    b.filter(x => x.status === "TERSEDIA").length,
        dipinjam:    b.filter(x => x.status === "DIPINJAM").length,
        maintenance: b.filter(x => x.status === "MAINTENANCE").length,
        total:       b.length,
      });

      setLoaded(true);
    }).catch(console.error);
  }, []);

  const maxKat = Math.max(...katStat.map(k => k.total), 1);

  if (!loaded) {
    return (
      <div>
        <div className="dash-heading">
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Dashboard Admin</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{today}</div>
        </div>
        <div className="grid-4 mb-20">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  return (
    <>
      <div className="dash-heading">
        <h1 className="page-title">Dashboard Admin</h1>
        <p className="page-sub">{today} · FTI UKSW</p>
      </div>

      {/* Stats — sesuai Requirements: Total Barang, Total Ruangan, Peminjaman Aktif, Pending Verifikasi */}
      <div className="grid-4 mb-20">
        {[
          { label: "Total Barang",       value: stats?.totalBarang       ?? 0, icon: "ti-box",            href: "/admin/barang" },
          { label: "Total Ruangan",      value: stats?.totalRuangan      ?? 0, icon: "ti-building",       href: "/admin/ruangan" },
          { label: "Peminjaman Aktif",   value: stats?.dipinjam          ?? 0, icon: "ti-arrows-exchange", href: "/admin/pinjam" },
          { label: "Pending Verifikasi", value: stats?.pendingVerifikasi ?? 0, icon: "ti-user-check",     href: "/admin/tim" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="glass stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon} dash-stat-icon`} />
            </div>
            <div className="stat-value">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="dash-body mb-16">
        <div className="dash-col-left">
          {/* Peminjaman aktif */}
          <div className="glass">
            <div className="dash-card-title">
              <div className="section-header">
                <span className="section-label">Peminjaman Aktif</span>
                <Link href="/admin/pinjam" className="see-all">Lihat semua</Link>
              </div>
            </div>
            <div className="dash-card-list">
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
                    <div className="list-item-info">
                      <div className="list-item-name">{t.barang.nama}</div>
                      <div className="list-item-sub">{t.barang.kodeBarang} · {t.namaPeminjam} · {fDateShort(t.deadlineKembali)}</div>
                    </div>
                    <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}>
                      {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribusi Kategori */}
          <div className="glass dash-card-pad">
            <div className="section-header">
              <span className="section-label">Distribusi per Kategori</span>
              <Link href="/admin/barang" className="see-all">Detail</Link>
            </div>
            <div className="flex-col gap-10">
              {katStat.map(k => (
                <div key={k.nama} className="bar-row">
                  <div className="bar-label" style={{ width: 110 }}>{k.nama}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.round((k.total / maxKat) * 100)}%` }} />
                  </div>
                  <div className="bar-val">{k.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-col-right">
          {/* Status Aset */}
          <div className="glass dash-card-pad">
            <span className="section-label nav-quick-label">Status Aset</span>
            <div className="flex-col gap-10">
              {[
                { label: "Tersedia",    val: statusStat.tersedia,    color: "var(--color-ok)",   pct: statusStat.total ? Math.round((statusStat.tersedia / statusStat.total) * 100) : 0 },
                { label: "Dipinjam",   val: statusStat.dipinjam,    color: "var(--color-warn)",  pct: statusStat.total ? Math.round((statusStat.dipinjam / statusStat.total) * 100) : 0 },
                { label: "Maintenance",val: statusStat.maintenance, color: "var(--text-muted)",  pct: statusStat.total ? Math.round((statusStat.maintenance / statusStat.total) * 100) : 0 },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.val}</span>
                  </div>
                  <div className="bar-track">
                    <div style={{ height: "100%", borderRadius: 10, width: `${item.pct}%`, background: item.color, transition: "width .5s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User stat */}
          <div className="glass dash-card-pad">
            <span className="section-label nav-quick-label">Pengguna Sistem</span>
            <div className="dash-summary" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "Total User", value: stats?.totalUsers        ?? 0, color: "var(--ds-mist)" },
                { label: "Pending",    value: stats?.pendingVerifikasi ?? 0, color: "var(--color-warn)" },
              ].map(item => (
                <div key={item.label} className="dash-summary-item">
                  <div className="dash-summary-val" style={{ color: item.color }}>{item.value}</div>
                  <div className="dash-summary-lbl">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aksi Cepat — updated links */}
          <div className="glass dash-card-pad">
            <span className="section-label nav-quick-label">Aksi Cepat</span>
            <div className="nav-quick-list">
              {[
                { href: "/admin/barang",   icon: "ti-plus",            label: "Tambah Barang" },
                { href: "/admin/tim",      icon: "ti-user-check",      label: "Verifikasi User" },
                { href: "/admin/laporan",  icon: "ti-file-description", label: "Input Pengeluaran" },
                { href: "/admin/ruangan",  icon: "ti-building",        label: "Kelola Ruangan" },
                { href: "/admin/pinjam",   icon: "ti-qrcode",          label: "Scan QR Pinjam" },
              ].map(a => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <i className={`ti ${a.icon} quick-action-icon`} />
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