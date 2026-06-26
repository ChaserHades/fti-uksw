// app/admin/dashboard/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import { SkeletonCard, SkeletonTable } from "@/components/LoadingSkeleton";
import type { DashboardStats, Transaksi, Barang } from "@/types";

interface KategoriStat { nama: string; total: number; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loaded, setLoaded] = useState(false);
  const hasFetched = useRef(false);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    Promise.all([
      api.get<DashboardStats>("/api/dashboard/stats"),
      api.get<{ data: Transaksi[] }>("/api/transaksi?status=AKTIF&limit=6"),
    ]).then(([s, tRes]) => {
      const t = (Array.isArray(tRes) ? tRes : (tRes as any).data || []) as Transaksi[];
      setStats(s);
      setTransaksi(t.slice(0, 6));
      setLoaded(true);
    }).catch(console.error);
  }, []);

  const katStat = stats?.katStat || [];
  const statusStat = stats?.statusStat || { tersedia: 0, dipinjam: 0, maintenance: 0, total: 0 };
  const maxKat = Math.max(...katStat.map(k => k.total), 1);

  if (!loaded) {
    return (
      <div className="animate-fade-in">
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
    <div className="animate-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
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
        @media (max-width: 1024px) {
          .bento-dashboard { gap: 16px; }
          .bento-span-8, .bento-span-4 { grid-column: span 12; }
        }
        @media (max-width: 640px) {
          .bento-card { padding: 24px; }
          .bento-row { padding: 16px; }
        }
      `}} />

      {/* 1. HEADING & ALERTS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Dashboard Admin</h1>
          <p className="page-sub">{today} · FTI UKSW</p>
        </div>
        {stats && stats.pendingVerifikasi > 0 && (
          <Link href="/admin/tim" className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: "20px", textDecoration: "none", animation: "pulse 2s infinite" }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{stats.pendingVerifikasi} User Butuh Verifikasi</span>
          </Link>
        )}
      </div>

      {/* 2. BENTO COCKPIT GRID */}
      <div className="bento-dashboard">
        
        {/* Total Aset (Span 8) */}
        <Link href="/admin/manajemen?tab=barang" className="bento-card bento-span-8">
          <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>Total Inventaris Aset</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: "clamp(3rem, 5vw, 5rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>{stats?.totalBarang ?? 0}</span>
            <span style={{ color: "var(--text-secondary)" }}>Items</span>
          </div>
          
          {/* Sleek Line Bar for Status */}
          <div style={{ marginTop: "auto", paddingTop: 32 }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--color-ok)", marginRight: 6 }}>●</span> {statusStat.tersedia} Tersedia</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--color-warn)", marginRight: 6 }}>●</span> {statusStat.dipinjam} Dipinjam</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}><span style={{ color: "var(--text-muted)", marginRight: 6 }}>●</span> {statusStat.maintenance} Maintenance</span>
            </div>
            <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ width: `${statusStat.total ? (statusStat.tersedia/statusStat.total)*100 : 0}%`, background: "var(--color-ok)" }} />
              <div style={{ width: `${statusStat.total ? (statusStat.dipinjam/statusStat.total)*100 : 0}%`, background: "var(--color-warn)" }} />
              <div style={{ width: `${statusStat.total ? (statusStat.maintenance/statusStat.total)*100 : 0}%`, background: "var(--text-muted)" }} />
            </div>
          </div>
        </Link>

        {/* Total Letak (Span 4) */}
        <Link href="/admin/manajemen?tab=letak" className="bento-card bento-span-4" style={{ justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-info)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600 }}>Letak Fasilitas</span>
          <div style={{ fontSize: "clamp(3rem, 5vw, 5rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text-primary)", marginTop: 16 }}>{stats?.totalLetak ?? 0}</div>
        </Link>

        {/* Peminjaman Aktif (Span 8) */}
        <div className="bento-card bento-span-8" style={{ padding: "32px 0 0 0" }}>
          <div style={{ padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, color: "var(--color-warn)" }}>Peminjaman Aktif ({stats?.dipinjam ?? 0})</span>
            <Link href="/admin/manajemen?tab=pinjam" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>Lihat Semua &rarr;</Link>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
            {transaksi.length === 0 ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Tidak ada peminjaman aktif saat ini.</div>
            ) : (
              transaksi.map((t, idx) => {
                const late = isOverdue(t.deadlineKembali);
                const soon = !late && isDueSoon(t.deadlineKembali);
                return (
                  <div key={t.id} className="bento-row" style={{ borderTop: idx === 0 ? "none" : "" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{t.namaPeminjam} · Deadline: {fDateShort(t.deadlineKembali)}</div>
                    </div>
                    <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 20 }}>
                      {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Distribusi Kategori (Span 4) */}
        <div className="bento-card bento-span-4">
          <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 24 }}>Top Kategori</span>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {katStat.map(k => {
              const maxKat = Math.max(...katStat.map(x => x.total), 1);
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
    </div>
  );
}