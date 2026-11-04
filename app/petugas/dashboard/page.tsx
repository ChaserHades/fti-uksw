// app/petugas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isDueSoon } from "@/helpers/format";
import { isLoanLate } from "@/helpers/peminjaman";
import type { Peminjaman, Barang } from "@/types";

interface Me { id: string; name: string; email: string; }

export default function TeknisiDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [myTrx, setMyTrx] = useState<Peminjaman[]>([]);
  const [allAktif, setAllAktif] = useState<Peminjaman[]>([]);
  const [tersedia, setTersedia] = useState<Barang[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then((d: Me) => {
      setMe(d);
      // Riwayat pribadi tetap di-load per-user untuk tabel bawah
      api.get<{ data: Peminjaman[] }>(`/api/peminjaman?userId=${d.id}`).then(res => setMyTrx(res.data));
    });
    // Ambil semua peminjaman aktif (limit besar) untuk statistik sistem
    api.get<{ data: Peminjaman[] }>("/api/peminjaman?status=AKTIF&limit=500").then(d => setAllAktif(d.data));
    api.get<{ data: Barang[] }>("/api/barang?tersedia=true&limit=5").then(d =>
      setTersedia(d.data)
    );
  }, []);

  // Statistik sistem (bukan hanya milik teknisi ini)
  const aktif     = allAktif.length;
  const terlambat = allAktif.filter(t => isLoanLate(t)).length;

  const statusBadge: Record<string, string> = { AKTIF: "badge-warn", SELESAI: "badge-ok" };
  const kondisiBadge: Record<string, string> = { BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger" };

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
        @media (max-width: 1024px) {
          .bento-dashboard { gap: 16px; }
          .bento-span-8, .bento-span-4 { grid-column: span 12; }
        }
        @media (max-width: 640px) {
          .bento-card { padding: 24px; }
          .bento-row { padding: 16px; }
        }
      `}} />

      {/* 1. HEADING */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Selamat datang, {me?.name ?? "Teknisi"}</h1>
          <p className="page-sub">{today}</p>
        </div>
      </div>

      {/* 2. BENTO COCKPIT GRID */}
      <div className="bento-dashboard">

        {/* STATS SISTEM (Span 8) */}
        <div className="bento-card bento-span-8" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
          <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, marginBottom: 24 }}>Ringkasan Peminjaman Sistem</span>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { label: "Sedang Dipinjam", value: aktif, color: "var(--color-warn)", href: "/petugas/manajemen?tab=pinjam" },
              { label: "Riwayat Saya", value: myTrx.length, color: "var(--color-ok)", href: "/petugas/manajemen?tab=riwayat" },
              { label: "Terlambat", value: terlambat, color: "var(--color-err)", href: "/petugas/manajemen?tab=pinjam" },
            ].map(s => (
              <Link key={s.label} href={s.href} style={{ flex: 1, minWidth: 120, textDecoration: "none" }}>
                <div style={{ fontSize: "clamp(2.5rem, 4vw, 4rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: s.color, marginBottom: 8 }}>{s.value}</div>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* PEMINJAMAN AKTIF SISTEM (Span 4) */}
        <div className="bento-card bento-span-4" style={{ padding: "32px 0 0 0" }}>
          <div style={{ padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, color: "var(--color-info)" }}>Peminjaman Sistem</span>
            <Link href="/petugas/manajemen?tab=pinjam" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>Proses</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {allAktif.length === 0 ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Kosong</div>
            ) : allAktif.map((t, idx) => {
              const late = isLoanLate(t);
              const soon = !late && isDueSoon(t.deadlineKembali);
              return (
                <div key={t.id} className="bento-row" style={{ padding: "12px 32px", borderTop: idx === 0 ? "none" : "" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{t.barang.kategori?.nama}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{t.namaPeminjam}</div>
                  </div>
                  <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`} style={{ padding: "2px 8px", fontSize: 10, borderRadius: 12 }}>
                    {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIWAYAT SAYA (Span 8) */}
        <div className="bento-card bento-span-8" style={{ padding: "32px 0 0 0" }}>
          <div style={{ padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600 }}>Riwayat Peminjaman Pribadi</span>
            <Link href="/petugas/manajemen?tab=riwayat" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>Lihat Semua</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {myTrx.length === 0 ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Belum ada riwayat peminjaman.</div>
            ) : myTrx.slice(0, 4).map((t, idx) => (
              <div key={t.id} className="bento-row" style={{ borderTop: idx === 0 ? "none" : "" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{t.barang.kategori?.nama}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{t.barang.label} · Deadline: {fDateShort(t.deadlineKembali)}</div>
                </div>
                <div>
                  {t.status === "AKTIF" && isLoanLate(t)
                    ? <span className="badge badge-danger">Terlambat</span>
                    : <span className={`badge ${statusBadge[t.status]}`}>{t.status}</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BARANG TERSEDIA (Span 4) */}
        <div className="bento-card bento-span-4" style={{ padding: "32px 0 0 0" }}>
          <div style={{ padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 600, color: "var(--color-ok)" }}>Barang Tersedia</span>
            <Link href="/petugas/manajemen?tab=barang" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>Semua</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {tersedia.length === 0 ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Tidak ada barang</div>
            ) : tersedia.map((b, idx) => (
              <div key={b.id} className="bento-row" style={{ padding: "12px 32px", borderTop: idx === 0 ? "none" : "" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{b.kategori?.nama}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{b.label}</div>
                </div>
                <span className={`badge ${kondisiBadge[b.kondisi]}`} style={{ padding: "2px 8px", fontSize: 10, borderRadius: 12 }}>
                  {b.kondisi === "BAIK" ? "Baik" : b.kondisi === "RUSAK_RINGAN" ? "Rusak" : "Rusak Berat"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}