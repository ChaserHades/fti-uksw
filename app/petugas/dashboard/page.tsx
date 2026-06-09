// app/petugas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import { api } from "@/helpers/api";
import type { Transaksi, Barang } from "@/types";

interface Me { id: string; name: string; email: string; }

export default function PetugasDashboard() {
  const [me, setMe]               = useState<Me | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [allAktif, setAllAktif]   = useState<Transaksi[]>([]);
  const [tersedia, setTersedia]   = useState<Barang[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then((d: Me) => {
      setMe(d);
      api.get<Transaksi[]>(`/api/transaksi?userId=${d.id}`).then(setTransaksi);
    });
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF").then(setAllAktif);
    api.get<Barang[]>("/api/barang?tersedia=true").then(d => setTersedia(d.slice(0, 5)));
  }, []);

  const aktif     = transaksi.filter(t => t.status === "AKTIF").length;
  const selesai   = transaksi.filter(t => t.status === "SELESAI").length;
  const terlambat = transaksi.filter(t => t.status === "TERLAMBAT").length;

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };
  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Selamat datang, {me?.name ?? "Petugas"}</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stats — grid-3 → 2col @860px → 1col @640px */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Sedang Saya Pinjam", value: aktif,     icon: "ti-arrow-bar-to-down", badge: "badge-warn" },
          { label: "Sudah Dikembalikan", value: selesai,   icon: "ti-circle-check",      badge: "badge-ok" },
          { label: "Terlambat Kembali",  value: terlambat, icon: "ti-alert-circle",      badge: "badge-danger" },
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

      {/* Quick Actions — grid-2 → 1col @640px */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Link href="/petugas/pinjam" className="glass"
          style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "rgba(65,90,119,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-arrow-bar-to-down" style={{ fontSize: 24, color: "var(--ds-mist)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Pinjam Barang</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Catat peminjaman aset baru</div>
          </div>
        </Link>
        <Link href="/petugas/kembali" className="glass"
          style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "rgba(65,90,119,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-arrow-bar-to-up" style={{ fontSize: 24, color: "var(--ds-mist)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Kembalikan Barang</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Catat pengembalian aset</div>
          </div>
        </Link>
      </div>

      {/* Main content — dash-half → 1col @860px */}
      <div className="dash-half" style={{ marginBottom: 16 }}>

        {/* Semua Peminjaman Aktif */}
        <div className="glass">
          <div style={{ padding: "16px 20px 0" }}>
            <div className="section-header">
              <span className="section-label">Semua Peminjaman Aktif</span>
              <Link href="/petugas/kembali" className="see-all">Proses →</Link>
            </div>
          </div>
          <div style={{ padding: "0 20px 12px" }}>
            {allAktif.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <i className="ti ti-inbox" style={{ fontSize: 24 }} />Tidak ada
              </div>
            ) : allAktif.slice(0, 5).map(t => {
              const late = isOverdue(t.deadlineKembali);
              const soon = !late && isDueSoon(t.deadlineKembali);
              return (
                <div key={t.id} className="list-item">
                  <div className="list-icon"><i className="ti ti-box" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.user.name ?? t.user.email}</div>
                  </div>
                  <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}
                    style={{ flexShrink: 0 }}>
                    {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Riwayat Saya */}
        <div className="glass">
          <div style={{ padding: "16px 20px 0" }}>
            <div className="section-header">
              <span className="section-label">Riwayat Saya</span>
              <Link href="/petugas/riwayat" className="see-all">Lihat semua →</Link>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Barang</th>
                  <th style={{ width: "30%" }}>Deadline</th>
                  <th style={{ width: "25%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transaksi.length === 0 ? (
                  <tr><td colSpan={3}>
                    <div className="empty-state" style={{ padding: "20px 0" }}>Belum ada</div>
                  </td></tr>
                ) : transaksi.slice(0, 5).map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.barang.kodeBarang}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{fDateShort(t.deadlineKembali)}</td>
                    <td><span className={`badge ${statusBadge[t.status]}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Barang Tersedia — fitur baru */}
      <div className="glass">
        <div style={{ padding: "16px 20px 0" }}>
          <div className="section-header">
            <span className="section-label">Barang Tersedia</span>
            <Link href="/petugas/listbarang" className="see-all">Lihat semua →</Link>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Nama Barang</th>
                <th style={{ width: "20%" }}>Kode</th>
                <th style={{ width: "20%" }}>Kategori</th>
                <th style={{ width: "20%" }}>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              {tersedia.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state" style={{ padding: "20px 0" }}>
                    <i className="ti ti-inbox" style={{ fontSize: 24 }} />Semua barang sedang dipinjam
                  </div>
                </td></tr>
              ) : tersedia.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {b.kodeBarang}
                  </td>
                  <td style={{ fontSize: 12 }}>{b.kategori?.nama ?? "—"}</td>
                  <td>
                    <span className={`badge ${kondisiBadge[b.kondisi] ?? "badge-muted"}`}>
                      {b.kondisi?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* CTA pinjam langsung */}
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--glass-border)" }}>
          <Link href="/petugas/pinjam" className="btn btn-primary btn-sm">
            <i className="ti ti-arrow-bar-to-down" style={{ fontSize: 14 }} />
            Pinjam Sekarang
          </Link>
        </div>
      </div>
    </>
  );
}