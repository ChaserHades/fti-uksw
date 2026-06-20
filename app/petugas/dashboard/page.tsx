// app/petugas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import type { Transaksi, Barang } from "@/types";

interface Me { id: string; name: string; email: string; }

export default function TeknisiDashboard() {
  const [me,       setMe]       = useState<Me | null>(null);
  const [myTrx,    setMyTrx]    = useState<Transaksi[]>([]);
  const [allAktif, setAllAktif] = useState<Transaksi[]>([]);
  const [tersedia, setTersedia] = useState<Barang[]>([]);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then((d: Me) => {
      setMe(d);
      api.get<Transaksi[]>(`/api/transaksi?userId=${d.id}`).then(setMyTrx);
    });
    api.get<Transaksi[]>("/api/transaksi?status=AKTIF").then(d => setAllAktif(d.slice(0, 5)));
    api.get<Barang[]>("/api/barang").then(d =>
      setTersedia(d.filter(b => b.status === "TERSEDIA").slice(0, 5))
    );
  }, []);

  const aktif     = myTrx.filter(t => t.status === "AKTIF").length;
  const selesai   = myTrx.filter(t => t.status === "SELESAI").length;
  const terlambat = myTrx.filter(t => t.status === "AKTIF" && isOverdue(t.deadlineKembali)).length;

  const statusBadge: Record<string, string> = { AKTIF: "badge-warn", SELESAI: "badge-ok" };
  const kondisiBadge: Record<string, string> = { BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger" };

  return (
    <>
      {/* Header */}
      <div className="dash-heading">
        <h1 className="page-title">Selamat datang, {me?.name ?? "Teknisi"}</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid-3 mb-16">
        {[
          { label: "Di Pinjam",     value: aktif,     icon: "ti-arrow-bar-to-down", color: "var(--color-warn)",  href: "/petugas/riwayat" },
          { label: "Sudah Kembali", value: selesai,   icon: "ti-circle-check",      color: "var(--color-ok)",    href: "/petugas/riwayat" },
          { label: "Terlambat",     value: terlambat, icon: "ti-alert-circle",       color: "var(--color-err)",  href: "/petugas/pinjam" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="glass stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon} dash-stat-icon`} style={{ color: s.color }} />
            </div>
            <div className="stat-value">{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions — prominent scan button */}
      <div className="dash-half mb-16">
        <Link href="/petugas/pinjam" className="glass qa-card">
          <div className="qa-card-icon">
            <i className="ti ti-qrcode" />
          </div>
          <div>
            <div className="qa-card-title">Scan QR Barang</div>
            <div className="qa-card-sub">Pinjam atau kembalikan otomatis</div>
          </div>
        </Link>
        <Link href="/petugas/listbarang" className="glass qa-card">
          <div className="qa-card-icon">
            <i className="ti ti-list-search" />
          </div>
          <div>
            <div className="qa-card-title">Cek Ketersediaan</div>
            <div className="qa-card-sub">Lihat daftar barang</div>
          </div>
        </Link>
      </div>

      {/* Body: two columns */}
      <div className="dash-body">
        <div className="dash-col-left">

          {/* Semua peminjaman aktif */}
          <div className="glass">
            <div className="dash-card-title">
              <div className="section-header">
                <span className="section-label">Peminjaman Aktif</span>
                <Link href="/petugas/pinjam" className="see-all">Proses</Link>
              </div>
            </div>
            <div className="dash-card-list">
              {allAktif.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 24, color: "var(--color-ok)" }} />
                  Tidak ada peminjaman aktif
                </div>
              ) : allAktif.map(t => {
                const late = isOverdue(t.deadlineKembali);
                const soon = !late && isDueSoon(t.deadlineKembali);
                return (
                  <div key={t.id} className="list-item">
                    <div className="list-icon"><i className="ti ti-box" /></div>
                    <div className="list-item-info">
                      <div className="list-item-name">{t.barang.nama}</div>
                      <div className="list-item-sub">{t.namaPeminjam} · {fDateShort(t.deadlineKembali)}</div>
                    </div>
                    <span className={`badge ${late ? "badge-danger" : soon ? "badge-warn" : "badge-ok"}`}>
                      {late ? "Terlambat" : soon ? "Segera" : "Aktif"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat saya */}
          <div className="glass">
            <div className="dash-card-title">
              <div className="section-header">
                <span className="section-label">Riwayat Saya</span>
                <Link href="/petugas/riwayat" className="see-all">Lihat semua</Link>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>Barang</th>
                    <th style={{ width: "22%" }}>Deadline</th>
                    <th style={{ width: "22%" }}>Tgl Kembali</th>
                    <th style={{ width: "18%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTrx.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state" style={{ padding: "20px 0" }}>Belum ada transaksi</div></td></tr>
                  ) : myTrx.slice(0, 5).map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="td-name">{t.barang.nama}</div>
                        <div className="td-code">{t.barang.kodeBarang}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{fDateShort(t.deadlineKembali)}</td>
                      <td style={{ fontSize: 12 }}>
                        {t.tanggalKembali
                          ? fDateShort(t.tanggalKembali)
                          : <span style={{ color: "var(--text-muted)" }}>—</span>
                        }
                      </td>
                      <td>
                        {t.status === "AKTIF" && isOverdue(t.deadlineKembali)
                          ? <span className="badge badge-danger">Terlambat</span>
                          : <span className={`badge ${statusBadge[t.status]}`}>{t.status}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dash-col-right">

          {/* Barang tersedia */}
          <div className="glass">
            <div className="dash-card-title">
              <div className="section-header">
                <span className="section-label">Barang Tersedia</span>
                <Link href="/petugas/listbarang" className="see-all">Semua</Link>
              </div>
            </div>
            <div className="dash-card-list">
              {tersedia.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <i className="ti ti-box-off" style={{ fontSize: 24 }} />Tidak ada
                </div>
              ) : tersedia.map(b => (
                <div key={b.id} className="list-item">
                  <div className="list-icon"><i className="ti ti-box" /></div>
                  <div className="list-item-info">
                    <div className="list-item-name">{b.nama}</div>
                    <div className="list-item-sub">{b.kategori?.nama} · {b.kodeBarang}</div>
                  </div>
                  <span className={`badge ${kondisiBadge[b.kondisi]}`}>
                    {b.kondisi === "BAIK" ? "Baik" : b.kondisi === "RUSAK_RINGAN" ? "Rusak Ringan" : "Rusak Berat"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 14px" }}>
              <Link href="/petugas/listbarang" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <i className="ti ti-list-search" /> Lihat Semua Barang
              </Link>
            </div>
          </div>

          {/* Navigasi Cepat */}
          <div className="glass nav-quick-section">
            <span className="section-label nav-quick-label">NAVIGASI CEPAT</span>
            <div className="nav-quick-list">
              {[
                { key: "scan",       href: "/petugas/pinjam",     icon: "ti-qrcode",          label: "Scan QR (Pinjam / Kembali)" },
                { key: "ruangan",    href: "/petugas/ruangan",    icon: "ti-arrows-exchange",  label: "Pindah Barang" },
                { key: "listbarang", href: "/petugas/listbarang", icon: "ti-list-search",      label: "Cek Ketersediaan" },
                { key: "riwayat",    href: "/petugas/riwayat",    icon: "ti-history",          label: "Riwayat Lengkap" },
              ].map(a => (
                <Link key={a.key} href={a.href} className="quick-action">
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