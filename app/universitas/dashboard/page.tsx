// app/universitas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import BarangDetailModal from "@/components/features/barang/BarangDetailModal";
import { fCurrency, terbilang, fDateShort } from "@/helpers/format";
import type { DashboardStats, Barang, Pengeluaran } from "@/types";

export default function UniversitasDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [damaged, setDamaged] = useState<Barang[]>([]);
  const [damagedLoading, setDamagedLoading] = useState(true);

  // Detail modal state
  const [detailBarang, setDetailBarang] = useState<Barang | null>(null);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    api.get<DashboardStats>("/api/dashboard/stats").then(setStats).catch(() => {});
    api.get<{ data: Barang[] }>("/api/barang?limit=8").then(d => setBarang(d.data)).catch(() => {});
    // Fetch all barang to filter damaged — use a large limit then sort client-side
    api.get<{ data: Barang[] }>("/api/barang?limit=all")
      .then(d => {
        const rusak = d.data
          .filter(b => b.kondisi === "RUSAK_BERAT" || b.kondisi === "RUSAK_RINGAN")
          .sort((a, b) => {
            if (a.kondisi === b.kondisi) return 0;
            return a.kondisi === "RUSAK_BERAT" ? -1 : 1;
          });
        setDamaged(rusak);
      })
      .catch(() => {})
      .finally(() => setDamagedLoading(false));
  }, []);

  function openDetail(b: Barang) {
    setDetailBarang(b);
  }

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };

  const kondisiCount = stats?.kondisiStat || { baik: 0, rusakRingan: 0, rusakBerat: 0 };
  const totalBarangSample = stats?.totalBarang || 0;
  const totalNominal = stats?.pengeluaranStat?.totalNominal || 0;
  const kategoriStat = stats?.katStat || [];

  return (
    <div className="animate-fade-in">
      <style dangerouslySetInnerHTML={{
        __html: `
        .bento-dashboard {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .bento-span-8 { grid-column: span 8; }
        .bento-span-4 { grid-column: span 4; }
        .bento-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 32px;
        }
        .bento-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
        }
        .bento-row {
          display: flex;
          align-items: center;
          padding: 16px 32px;
          border-top: 1px solid rgba(255,255,255,0.1);
          transition: background 0.2s;
        }
        .bento-row:hover {
          background: rgba(255,255,255,0.06);
        }
        .perhatian-section {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        .perhatian-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        @media (max-width: 1024px) {
          .bento-dashboard { gap: 16px; }
          .bento-span-8, .bento-span-4 { grid-column: span 12; }
        }
        @media (max-width: 640px) {
          .bento-card { padding: 24px; }
          .bento-row { padding: 16px; }
          .perhatian-header { padding: 16px; }
        }
      `}} />

      {/* 1. HEADING */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Overview Aset FTI UKSW</h1>
          <p className="page-sub">{today} · Eksekutif Dashboard</p>
        </div>
      </div>

      {/* 2. BENTO COCKPIT GRID */}
      <div className="bento-dashboard">

        {/* TOTAL ASET & KONDISI (Span 8) */}
        <Link href="/universitas/manajemen?tab=barang" className="bento-card bento-span-8">
          <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>Total Inventaris FTI</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: "clamp(3rem, 5vw, 5rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>{stats?.totalBarang ?? 0}</span>
            <span style={{ color: "var(--text-secondary)" }}>Items</span>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32 }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--color-ok)", marginRight: 6 }}>●</span> {kondisiCount.baik} Baik</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--color-warn)", marginRight: 6 }}>●</span> {kondisiCount.rusakRingan} Rusak Ringan</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--color-err)", marginRight: 6 }}>●</span> {kondisiCount.rusakBerat} Rusak Berat</span>
            </div>
            <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ width: `${totalBarangSample ? (kondisiCount.baik / totalBarangSample) * 100 : 0}%`, background: "var(--color-ok)" }} />
              <div style={{ width: `${totalBarangSample ? (kondisiCount.rusakRingan / totalBarangSample) * 100 : 0}%`, background: "var(--color-warn)" }} />
              <div style={{ width: `${totalBarangSample ? (kondisiCount.rusakBerat / totalBarangSample) * 100 : 0}%`, background: "var(--color-err)" }} />
            </div>
          </div>
        </Link>

        {/* FINANCIAL PENGELUARAN (Span 4) */}
        <Link href="/universitas/manajemen?tab=laporan" className="bento-card bento-span-4" style={{ justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-warn)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600 }}>Total Pengeluaran</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--color-ok)" }}>
              {fCurrency(totalNominal)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                ({terbilang(totalNominal)} Rupiah)
              </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Dari {stats?.pengeluaranStat?.count || 0} catatan pengeluaran</span>
            </div>
          </div>
        </Link>

        {/* ASET TERBARU (Span 8) */}
        <div className="bento-card bento-span-8" style={{ padding: "32px 0 0 0" }}>
          <div style={{ padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, color: "var(--color-info)" }}>Aset Terbaru FTI</span>
            <Link href="/universitas/manajemen?tab=barang" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>Lihat Semua</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {barang.length === 0 ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Belum ada data</div>
            ) : barang.slice(0, 5).map((b, idx) => (
              <div key={b.id} className="bento-row" style={{ borderTop: idx === 0 ? "none" : "" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{b.namaBarang || b.kategori?.nama}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{b.label}</div>
                </div>
                <span className={`badge ${kondisiBadge[b.kondisi]}`} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20 }}>
                  {b.kondisi.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DISTRIBUSI KATEGORI (Span 4) */}
        <div className="bento-card bento-span-4">
          <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 24 }}>Top Kategori</span>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {kategoriStat.length === 0 ? (
              <div style={{ color: "var(--text-muted)" }}>Tidak ada data</div>
            ) : kategoriStat.map((k) => {
              const maxKat = Math.max(...kategoriStat.map(x => x.total), 1);
              return (
                <div key={k.nama} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{k.nama}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{k.total}</span>
                  </div>
                  <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1 }}>
                    <div style={{ width: `${(k.total / maxKat) * 100}%`, height: "100%", background: "var(--text-primary)", borderRadius: 1 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. ASET PERLU PERHATIAN */}
      <div className="perhatian-section">
        <div className="perhatian-header">
          <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: "var(--color-err)" }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Aset Perlu Perhatian</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Aset dalam kondisi Rusak Berat atau Rusak Ringan yang memerlukan tindak lanjut
            </div>
          </div>
          {!damagedLoading && (
            <span className="badge badge-danger" style={{ marginLeft: "auto", fontSize: 12 }}>
              {damaged.length} aset
            </span>
          )}
        </div>

        {damagedLoading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px", width: 24, height: 24 }} />
            <div style={{ fontSize: 13 }}>Memuat data aset...</div>
          </div>
        ) : damaged.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="ti ti-circle-check" style={{ fontSize: 32, display: "block", marginBottom: 10, color: "var(--color-ok)" }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>Tidak ada aset yang memerlukan perhatian.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Semua aset tercatat dalam kondisi baik.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Nama Barang</th>
                  <th style={{ width: "10%" }}>Kondisi</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "14%" }}>Label</th>
                  <th style={{ width: "14%" }}>Label Aset</th>
                  <th style={{ width: "18%" }}>Keterangan / Ruangan</th>
                  <th style={{ width: "8%" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {damaged.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 14 }}>{b.namaBarang || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Tanpa Nama</span>}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{b.kategori?.nama}</div>
                    </td>
                    <td>
                      {b.kondisi === "RUSAK_BERAT" && (
                        <span className="badge badge-danger" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} /> Rusak Berat
                        </span>
                      )}
                      {b.kondisi === "RUSAK_RINGAN" && (
                        <span className="badge badge-warn" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} /> Rusak Ringan
                        </span>
                      )}
                    </td>
                    <td>
                      {b.status === "TERSEDIA" && <span className="badge badge-ok" style={{ fontSize: 10 }}>Tersedia</span>}
                      {b.status === "DIPINJAM" && <span className="badge badge-warn" style={{ fontSize: 10 }}>Dipinjam</span>}
                      {b.status === "MAINTENANCE" && <span className="badge badge-muted" style={{ fontSize: 10 }}>Mainte.</span>}
                    </td>
                    <td className="td-code">{b.label || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                    <td className="td-code">{b.labelAset || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                    <td>
                      {b.keterangan && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>{b.keterangan}</div>}
                      {b.ruangan && <div style={{ fontSize: 11, color: "var(--text-muted)" }}><i className="ti ti-building" style={{ marginRight: 4 }} />{b.ruangan.nama}</div>}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openDetail(b)}
                        style={{ fontSize: 12 }}
                      >
                        <i className="ti ti-eye" /> Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal (read-only) */}
      <BarangDetailModal barang={detailBarang} onClose={() => setDetailBarang(null)} />
    </div>
  );
}
