// app/universitas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { api } from "@/helpers/api";
import type { DashboardStats, Transaksi } from "@/types";

const CHART_BARS = [40, 60, 45, 80, 65, 90, 55];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function UniversitasDashboard() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Transaksi[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats").then(setStats).catch(console.error);
    api.get<Transaksi[]>("/api/transaksi")
      .then((d) => setRecent(d.slice(0, 5)))
      .catch(console.error);
  }, []);

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Overview Aset FTI</h1>
        <p className="page-sub">{today}</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Total Aset"    value={stats?.totalBarang  ?? "—"} icon="ti-box"              badge="Terdaftar" badgeClass="badge-ok" />
        <StatCard label="Dipinjam"      value={stats?.dipinjam     ?? "—"} icon="ti-arrows-exchange"  badge="Aktif"     badgeClass="badge-warn" />
        <StatCard label="Terlambat"     value={stats?.terlambat    ?? "—"} icon="ti-alert-circle"     badge="Alert"     badgeClass="badge-danger" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent transactions */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Transaksi Terbaru</span>
                <Link href="/universitas/transaksi" className="see-all">Lihat semua →</Link>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>Barang</th><th>Peminjam</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={3}><div className="empty-state" style={{ padding: "24px 0" }}>Tidak ada data</div></td></tr>
                  ) : recent.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.barang.kodeBarang}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{t.user.name ?? t.user.email}</td>
                      <td><span className={`badge ${statusBadge[t.status]}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="glass" style={{ padding: "16px 20px" }}>
            <div className="section-header">
              <span className="section-label">Aktivitas 7 Hari</span>
              <span className="badge badge-ok">Minggu ini</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
              {CHART_BARS.map((h, i) => (
                <div key={i} className={`chart-bar${i === 5 ? " active" : ""}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, paddingTop: 6 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{d}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: quick links */}
        <div className="glass" style={{ padding: "18px 20px", alignSelf: "start" }}>
          <span className="section-label">Navigasi Cepat</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
            {[
              { href: "/universitas/barang",    icon: "ti-box",              label: "Lihat Daftar Aset" },
              { href: "/universitas/transaksi", icon: "ti-file-description", label: "Laporan Peminjaman" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="quick-action">
                <i className={`ti ${a.icon}`} style={{ color: "var(--ds-mist)", fontSize: 16 }} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
