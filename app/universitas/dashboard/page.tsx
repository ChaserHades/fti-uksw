// app/universitas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue } from "@/helpers/format";
import type { DashboardStats, Transaksi, Barang } from "@/types";

interface KategoriStat { nama: string; total: number; }
interface BarangFreq   { nama: string; kode: string; count: number; }

export default function UniversitasDashboard() {
  const [stats,        setStats]        = useState<DashboardStats | null>(null);
  const [recent,       setRecent]       = useState<Transaksi[]>([]);
  const [barang,       setBarang]       = useState<Barang[]>([]);
  const [kategoriStat, setKategoriStat] = useState<KategoriStat[]>([]);
  const [topBarang,    setTopBarang]    = useState<BarangFreq[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats").then(setStats);
    api.get<Transaksi[]>("/api/transaksi").then(d => setRecent(d.slice(0, 6)));
    api.get<Barang[]>("/api/barang").then(d => {
      setBarang(d.slice(0, 5));
      const katMap: Record<string, number> = {};
      d.forEach(b => {
        const k = b.kategori?.nama ?? "Lainnya";
        katMap[k] = (katMap[k] ?? 0) + 1;
      });
      setKategoriStat(
        Object.entries(katMap)
          .map(([nama, total]) => ({ nama, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );
    });
    api.get<Transaksi[]>("/api/transaksi").then(all => {
      const freq: Record<string, { nama: string; kode: string; count: number }> = {};
      all.forEach(t => {
        const id = t.barang.id;
        if (!freq[id]) freq[id] = { nama: t.barang.nama, kode: t.barang.kodeBarang, count: 0 };
        freq[id].count++;
      });
      setTopBarang(
        Object.values(freq)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    });
  }, []);

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };

  const kondisiCount = {
    BAIK:         barang.filter(b => b.kondisi === "BAIK").length,
    RUSAK_RINGAN: barang.filter(b => b.kondisi === "RUSAK_RINGAN").length,
    RUSAK_BERAT:  barang.filter(b => b.kondisi === "RUSAK_BERAT").length,
  };
  const totalBarangSample = Object.values(kondisiCount).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="dash-heading">
        <h1 className="page-title">Overview Aset FTI UKSW</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-16">
        {[
          { label: "Total Aset", value: stats?.totalBarang ?? "—", icon: "ti-box",             color: "var(--ds-mist)" },
          { label: "Dipinjam",   value: stats?.dipinjam    ?? "—", icon: "ti-arrows-exchange", color: "var(--color-warn)" },
          { label: "Terlambat",  value: stats?.terlambat   ?? "—", icon: "ti-alert-circle",    color: "var(--color-err)" },
          { label: "Total User", value: stats?.totalUsers  ?? "—", icon: "ti-users",           color: "var(--color-ok)" },
        ].map(s => (
          <div key={s.label} className="glass stat-card">
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon} dash-stat-icon`} style={{ color: s.color }} />
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Kondisi + Kategori — side by side */}
      <div className="dash-half mb-16">
        {/* Kondisi Barang */}
        <div className="glass" style={{ padding: "18px 20px" }}>
          <div className="section-header">
            <span className="section-label">Kondisi Barang</span>
            <Link href="/universitas/barang" className="see-all">Detail →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Baik",         val: kondisiCount.BAIK,         color: "var(--color-ok)",  pct: totalBarangSample ? Math.round((kondisiCount.BAIK / totalBarangSample) * 100) : 0 },
              { label: "Rusak Ringan", val: kondisiCount.RUSAK_RINGAN, color: "var(--color-warn)", pct: totalBarangSample ? Math.round((kondisiCount.RUSAK_RINGAN / totalBarangSample) * 100) : 0 },
              { label: "Rusak Berat",  val: kondisiCount.RUSAK_BERAT,  color: "var(--color-err)",  pct: totalBarangSample ? Math.round((kondisiCount.RUSAK_BERAT / totalBarangSample) * 100) : 0 },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>
                    {item.val} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({item.pct}%)</span>
                  </span>
                </div>
                <div className="bar-track">
                  <div style={{ height: "100%", borderRadius: 10, width: `${item.pct}%`, background: item.color, transition: "width .4s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribusi Kategori */}
        <div className="glass" style={{ padding: "18px 20px" }}>
          <span className="section-label" style={{ display: "block", marginBottom: 14 }}>Distribusi per Kategori</span>
          {kategoriStat.length === 0 ? (
            <div className="empty-state" style={{ padding: "16px 0" }}>Tidak ada data</div>
          ) : (() => {
            const maxVal = Math.max(...kategoriStat.map(k => k.total), 1);
            return (
              <div className="flex-col gap-10">
                {kategoriStat.map(k => (
                  <div key={k.nama} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 100, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nama}</div>
                    <div className="bar-track" style={{ flex: 1 }}>
                      <div className="bar-fill" style={{ width: `${Math.round((k.total / maxVal) * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 28, textAlign: "right", flexShrink: 0 }}>{k.total}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Body: Tables + sidebar */}
      <div className="dash-body">
        <div className="dash-col-left">
          {/* Transaksi Terbaru */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Transaksi Terbaru</span>
                <Link href="/universitas/transaksi" className="see-all">Lihat semua →</Link>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Barang</th>
                    <th style={{ width: "25%" }}>Peminjam</th>
                    <th style={{ width: "20%" }}>Deadline</th>
                    <th style={{ width: "20%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state" style={{ padding: "20px 0" }}>Tidak ada data</div></td></tr>
                  ) : recent.map(t => {
                    const late = t.status === "AKTIF" && isOverdue(t.deadlineKembali);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.barang.kodeBarang}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{t.user.name ?? t.user.email}</td>
                        <td style={{ fontSize: 12 }}>{fDateShort(t.deadlineKembali)}</td>
                        <td>
                          {late
                            ? <span className="badge badge-danger">Terlambat</span>
                            : <span className={`badge ${t.status === "SELESAI" ? "badge-ok" : "badge-warn"}`}>{t.status}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aset Terbaru */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Aset Terbaru</span>
                <Link href="/universitas/barang" className="see-all">Lihat semua →</Link>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Nama</th>
                    <th style={{ width: "25%" }}>Kategori</th>
                    <th style={{ width: "30%" }}>Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {barang.length === 0 ? (
                    <tr><td colSpan={3}><div className="empty-state" style={{ padding: "20px 0" }}>Tidak ada data</div></td></tr>
                  ) : barang.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{b.kodeBarang}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{b.kategori.nama}</td>
                      <td><span className={`badge ${kondisiBadge[b.kondisi]}`}>{b.kondisi.replace(/_/g, " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="dash-col-right">
          {/* Barang paling sering dipinjam */}
          <div className="glass">
            <div className="dash-card-title">
              <div className="section-header">
                <span className="section-label">Paling Sering Dipinjam</span>
              </div>
            </div>
            <div className="dash-card-list">
              {topBarang.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <i className="ti ti-inbox" style={{ fontSize: 24 }} />Belum ada data
                </div>
              ) : topBarang.map((b, i) => (
                <div key={b.kode} className="list-item">
                  <div className="list-item-idx">{i + 1}</div>
                  <div className="list-item-info">
                    <div className="list-item-name">{b.nama}</div>
                    <div className="list-item-sub">{b.kode}</div>
                  </div>
                  <span className="badge badge-info">{b.count}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass dash-card-pad">
            <span className="section-label nav-quick-label">NAVIGASI</span>
            <div className="nav-quick-list">
              {[
                { href: "/universitas/barang",    icon: "ti-box",           label: "Inventaris Aset" },
                { href: "/universitas/transaksi", icon: "ti-history",       label: "Riwayat Transaksi" },
                { href: "/universitas/pembelian", icon: "ti-shopping-cart", label: "Pengajuan Pembelian" },
              ].map(a => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <i className={`ti ${a.icon} quick-action-icon`} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Transparansi Anggaran */}
          <div className="glass dash-card-pad">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Transparansi Anggaran
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 14 }}>
              Riwayat pembelian & penggunaan anggaran FTI
            </div>
            <Link href="/universitas/pembelian" className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
              <i className="ti ti-receipt" style={{ fontSize: 14 }} />
              Lihat Pembelian
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}