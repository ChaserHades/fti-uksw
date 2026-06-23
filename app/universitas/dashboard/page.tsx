// app/universitas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import QuickActionCard from "@/components/QuickActionCard";
import ProgressList from "@/components/ProgressList";
import { api } from "@/helpers/api";
import type { DashboardStats, Barang, Pengeluaran } from "@/types";

interface KategoriStat { nama: string; total: number; }

export default function UniversitasDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [kategoriStat, setKategoriStat] = useState<KategoriStat[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats").then(setStats);

    api.get<Pengeluaran[]>("/api/pengeluaran").then(d => {
      setPengeluaran(d);
    });

    api.get<Barang[]>("/api/barang").then(d => {
      setBarang(d.slice(0, 8)); // Get latest 8 items
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
  }, []);

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };

  const kondisiCount = {
    BAIK: barang.filter(b => b.kondisi === "BAIK").length,
    RUSAK_RINGAN: barang.filter(b => b.kondisi === "RUSAK_RINGAN").length,
    RUSAK_BERAT: barang.filter(b => b.kondisi === "RUSAK_BERAT").length,
  };
  const totalBarangSample = Object.values(kondisiCount).reduce((a, b) => a + b, 0);
  const totalNominal = pengeluaran.reduce((sum, p) => sum + p.nominal, 0);

  return (
    <>
      <div className="dash-heading">
        <h1 className="page-title">Overview Aset FTI UKSW</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-16">
        {[
          { label: "Total Aset", value: stats?.totalBarang ?? "—", icon: "ti-box", color: "var(--ds-mist)" },
          { label: "Data Pengeluaran", value: pengeluaran.length, icon: "ti-receipt", color: "var(--color-warn)" },
          { label: "Total Nominal", value: `Rp ${totalNominal.toLocaleString("id-ID")}`, icon: "ti-wallet", color: "var(--color-ok)" },
          { label: "Kategori Barang", value: kategoriStat.length, icon: "ti-category", color: "var(--color-info)" },
        ].map(s => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            iconColor={s.color}
            valueStyle={{ fontSize: s.label === "Total Nominal" ? 20 : undefined }}
          />
        ))}
      </div>

      {/* Kondisi + Kategori — side by side */}
      <div className="dash-half mb-16">
        {/* Kondisi Barang */}
        <div className="glass dash-card-pad">
          <div className="section-header">
            <span className="section-label">Kondisi Barang</span>
            <Link href="/universitas/barang" className="see-all">Detail</Link>
          </div>
          <ProgressList items={[
            { label: "Baik", val: kondisiCount.BAIK, color: "var(--color-ok)", pct: totalBarangSample ? Math.round((kondisiCount.BAIK / totalBarangSample) * 100) : 0 },
            { label: "Rusak Ringan", val: kondisiCount.RUSAK_RINGAN, color: "var(--color-warn)", pct: totalBarangSample ? Math.round((kondisiCount.RUSAK_RINGAN / totalBarangSample) * 100) : 0 },
            { label: "Rusak Berat", val: kondisiCount.RUSAK_BERAT, color: "var(--color-err)", pct: totalBarangSample ? Math.round((kondisiCount.RUSAK_BERAT / totalBarangSample) * 100) : 0 },
          ]} />
        </div>

        {/* Distribusi Kategori */}
        <div className="glass dash-card-pad">
          <span className="section-label" style={{ display: "block", marginBottom: 14 }}>Distribusi per Kategori</span>
          {kategoriStat.length === 0 ? (
            <div className="empty-state" style={{ padding: "16px 0" }}>Tidak ada data</div>
          ) : (() => {
            const maxVal = Math.max(...kategoriStat.map(k => k.total), 1);
            return (
              <ProgressList items={kategoriStat.map(k => ({
                label: k.nama,
                val: k.total,
                color: "var(--color-info)",
                pct: Math.round((k.total / maxVal) * 100)
              }))} />
            );
          })()}
        </div>
      </div>

      {/* Body: Tables + sidebar */}
      <div className="dash-body">
        <div className="dash-col-left">
          {/* Aset Terbaru */}
          <div className="glass" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Aset Terbaru FTI</span>
                <Link href="/universitas/barang" className="see-all">Lihat semua</Link>
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
          {/* Quick Links Compact */}
          <div className="glass dash-card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="section-label" style={{ display: "block" }}>Navigasi Cepat</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/universitas/barang" className="glass stat-card" style={{ flexDirection: "row", alignItems: "center", padding: "16px", gap: "16px", textDecoration: "none", margin: 0 }}>
                <div className="flex-center" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 8, flexShrink: 0 }}>
                  <i className="ti ti-box" style={{ fontSize: 20, color: "var(--color-info)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 15, lineHeight: 1.2 }}>Inventaris Aset</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Data seluruh barang</span>
                </div>
              </Link>
              <Link href="/universitas/pembelian" className="glass stat-card" style={{ flexDirection: "row", alignItems: "center", padding: "16px", gap: "16px", textDecoration: "none", margin: 0 }}>
                <div className="flex-center" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", borderRadius: 8, flexShrink: 0 }}>
                  <i className="ti ti-receipt" style={{ fontSize: 20, color: "var(--color-warn)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 15, lineHeight: 1.2 }}>Laporan Cashflow</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Catatan pengeluaran</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}