// app/universitas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
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

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };
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
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Overview Aset FTI UKSW</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stat Cards — grid-4 → 2col @1100px → 1col @640px */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Aset", value: stats?.totalBarang ?? "—", icon: "ti-box" },
          { label: "Dipinjam",   value: stats?.dipinjam    ?? "—", icon: "ti-arrows-exchange" },
          { label: "Terlambat",  value: stats?.terlambat   ?? "—", icon: "ti-alert-circle" },
          { label: "Total User", value: stats?.totalUsers  ?? "—", icon: "ti-users" },
        ].map(s => (
          <div key={s.label} className="glass stat-card">
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Analitik — dash-half → 1col @860px */}
      <div className="dash-half" style={{ marginBottom: 16 }}>

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

        {/* Paling Sering Dipinjam */}
        <div className="glass">
          <div style={{ padding: "16px 20px 0" }}>
            <div className="section-header">
              <span className="section-label">Paling Sering Dipinjam</span>
              <Link href="/universitas/transaksi" className="see-all">Lihat semua →</Link>
            </div>
          </div>
          <div style={{ padding: "0 20px 12px" }}>
            {topBarang.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <i className="ti ti-inbox" style={{ fontSize: 24 }} />Belum ada data
              </div>
            ) : topBarang.map((b, i) => (
              <div key={b.kode} className="list-item">
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: "rgba(65,90,119,.40)", border: "1px solid rgba(119,141,169,.20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--ds-mist)" }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nama}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{b.kode}</div>
                </div>
                <span className="badge badge-info" style={{ flexShrink: 0 }}>{b.count}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistik per Kategori */}
      <div className="glass" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <div className="section-header">
          <span className="section-label">Statistik per Kategori Barang</span>
          <Link href="/universitas/barang" className="see-all">Detail →</Link>
        </div>
        {kategoriStat.length === 0 ? (
          <div className="empty-state" style={{ padding: "16px 0" }}>Tidak ada data</div>
        ) : (() => {
          const maxVal = Math.max(...kategoriStat.map(k => k.total), 1);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kategoriStat.map(k => (
                <div key={k.nama} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nama}</div>
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

      {/* Transaksi + Aset terbaru — dash-half → 1col @860px */}
      <div className="dash-half" style={{ marginBottom: 16 }}>
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
                  <th style={{ width: "45%" }}>Barang</th>
                  <th style={{ width: "30%" }}>Peminjam</th>
                  <th style={{ width: "25%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding: "20px 0" }}>Tidak ada data</div></td></tr>
                ) : recent.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fDateShort(t.deadlineKembali)}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{t.user.name ?? t.user.email}</td>
                    <td><span className={`badge ${statusBadge[t.status]}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

      {/* Ringkasan Status Aset */}
      <div className="glass" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <span className="section-label" style={{ marginBottom: 14, display: "block" }}>Ringkasan Status Aset</span>
        <div className="dash-summary">
          {[
            { label: "Total Terdaftar", value: stats?.totalBarang ?? 0,                                color: "var(--color-ok)" },
            { label: "Sedang Dipinjam", value: stats?.dipinjam    ?? 0,                                color: "var(--color-warn)" },
            { label: "Tersedia",        value: (stats?.totalBarang ?? 0) - (stats?.dipinjam ?? 0),     color: "var(--ds-mist)" },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", padding: "16px 8px", background: "rgba(65,90,119,0.15)", borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortcut ke Pembelian Barang */}
      <div className="glass" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
              Transparansi Penggunaan Anggaran
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Lihat riwayat pembelian barang baru dan penggunaan anggaran FTI UKSW
            </div>
          </div>
          <Link href="/universitas/pembelian" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            <i className="ti ti-receipt" style={{ fontSize: 14 }} />
            Lihat Pembelian
          </Link>
        </div>
      </div>
    </>
  );
}