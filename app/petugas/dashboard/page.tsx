"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import { fDateShort, isOverdue, isDueSoon } from "@/helpers/format";
import type { Transaksi, Barang } from "@/types";

interface Me { id: string; name: string; email: string; }

export default function PetugasDashboard() {
  const [me,          setMe]          = useState<Me | null>(null);
  const [myTrx,       setMyTrx]       = useState<Transaksi[]>([]);
  const [allAktif,    setAllAktif]    = useState<Transaksi[]>([]);
  const [tersediaList,setTersediaList]= useState<Barang[]>([]);

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
      setTersediaList(d.filter(b => b.status === "TERSEDIA").slice(0, 5))
    );
  }, []);

  const aktif     = myTrx.filter(t => t.status === "AKTIF").length;
  const selesai   = myTrx.filter(t => t.status === "SELESAI").length;
  const terlambat = myTrx.filter(t => t.status === "AKTIF" && isOverdue(t.deadlineKembali)).length;

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };
  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok",
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Selamat datang, {me?.name ?? "Petugas"}</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Di Pinjam",     value: aktif,     icon: "ti-arrow-bar-to-down", href: "/petugas/riwayat" },
          { label: "Sudah Kembali",   value: selesai,   icon: "ti-circle-check",      href: "/petugas/riwayat" },
          { label: "Terlambat",       value: terlambat, icon: "ti-alert-circle",      href: "/petugas/pinjam" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="glass stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
              <i className={`ti ${s.icon}`} style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
            </div>
            <div className="stat-value">{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Main body */}
      <div className="dash-body" style={{ marginBottom: 16 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick actions — satu page menangani pinjam & kembali via scan */}
          <div className="dash-half">
            <Link href="/petugas/pinjam" className="glass" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: "rgba(65,90,119,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-qrcode" style={{ fontSize: 22, color: "var(--ds-mist)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Scan QR Barang</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pinjam atau kembalikan otomatis</div>
              </div>
            </Link>
            <Link href="/petugas/listbarang" className="glass" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: "rgba(65,90,119,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-list-search" style={{ fontSize: 22, color: "var(--ds-mist)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Cek Ketersediaan</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Lihat daftar barang</div>
              </div>
            </Link>
          </div>

          {/* Semua pinjaman aktif (semua user) */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Semua Peminjaman Aktif</span>
                <Link href="/petugas/pinjam" className="see-all">Proses</Link>
              </div>
            </div>
            <div style={{ padding: "0 20px 12px" }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.barang.nama}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.user.name ?? t.user.email} · {fDateShort(t.deadlineKembali)}</div>
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
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Riwayat</span>
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
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
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
                          ? <span className="badge badge-danger">TERLAMBAT</span>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Barang tersedia — preview, link ke listbarang */}
          <div className="glass">
            <div style={{ padding: "16px 20px 0" }}>
              <div className="section-header">
                <span className="section-label">Barang Tersedia</span>
                <Link href="/petugas/listbarang" className="see-all">Semua</Link>
              </div>
            </div>
            <div style={{ padding: "0 20px 12px" }}>
              {tersediaList.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <i className="ti ti-box-off" style={{ fontSize: 24 }} />Tidak ada barang tersedia
                </div>
              ) : tersediaList.map(b => (
                <div key={b.id} className="list-item">
                  <div className="list-icon"><i className="ti ti-box" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.kategori?.nama} · {b.kodeBarang}</div>
                  </div>
                  <span className={`badge ${kondisiBadge[b.kondisi]}`}>{b.kondisi === "BAIK" ? "Baik" : b.kondisi === "RUSAK_RINGAN" ? "Rusak Ringan" : "Rusak Berat"}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 14px" }}>
              <Link href="/petugas/listbarang" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <i className="ti ti-list-search" /> Lihat Semua Barang Tersedia
              </Link>
            </div>
          </div>

          {/* Quick links — key unik per item, walau href sama untuk dua aksi pinjam page */}
          <div className="glass" style={{ padding: "18px 20px" }}>
            <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Navigasi Cepat</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { key: "scan",      href: "/petugas/pinjam",     icon: "ti-qrcode",             label: "Scan QR (Pinjam / Kembali)" },
                { key: "listbarang",href: "/petugas/listbarang", icon: "ti-list-search",        label: "Cek Ketersediaan" },
                { key: "riwayat",   href: "/petugas/riwayat",    icon: "ti-history",            label: "Riwayat Lengkap" },
              ].map(a => (
                <Link key={a.key} href={a.href} className="quick-action">
                  <i className={`ti ${a.icon}`} style={{ color: "var(--ds-mist)", fontSize: 16, flexShrink: 0 }} />
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