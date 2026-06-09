// app/petugas/listbarang/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";
import type { Barang } from "@/types";

interface Kategori { id: string; nama: string; }

const KONDISI_BADGE: Record<string, string> = {
  BAIK:         "badge-ok",
  RUSAK_RINGAN: "badge-warn",
  RUSAK_BERAT:  "badge-danger",
};

const KONDISI_LABEL: Record<string, string> = {
  BAIK:         "Baik",
  RUSAK_RINGAN: "Rusak Ringan",
  RUSAK_BERAT:  "Rusak Berat",
};

export default function ListBarangPage() {
  const [barang,    setBarang]    = useState<Barang[]>([]);
  const [kategori,  setKategori]  = useState<Kategori[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Filter state
  const [search,      setSearch]      = useState("");
  const [filterKat,   setFilterKat]   = useState("semua");
  const [filterKond,  setFilterKond]  = useState("semua");
  const [filterStatus, setFilterStatus] = useState("tersedia"); // tersedia | semua

  useEffect(() => {
    Promise.all([
      api.get<Barang[]>("/api/barang"),
      api.get<Kategori[]>("/api/kategori"),
    ]).then(([b, k]) => {
      setBarang(b);
      setKategori(k);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return barang.filter(b => {
      const matchSearch = b.nama.toLowerCase().includes(search.toLowerCase()) ||
                          b.kodeBarang.toLowerCase().includes(search.toLowerCase());
      const matchKat    = filterKat  === "semua" || b.kategori?.id === filterKat;
      const matchKond   = filterKond === "semua" || b.kondisi === filterKond;
      // "tersedia" = tidak sedang dipinjam (status TERSEDIA atau field dipinjam === false)
      // asumsi: Barang memiliki field `status` atau `dipinjam`; pakai kondisi paling umum
      const matchStatus = filterStatus === "semua" ||
                          (filterStatus === "tersedia" && (b as any).status === "TERSEDIA") ||
                          (filterStatus === "dipinjam" && (b as any).status === "DIPINJAM");
      return matchSearch && matchKat && matchKond && matchStatus;
    });
  }, [barang, search, filterKat, filterKond, filterStatus]);

  // Ringkasan counts
  const countTersedia = barang.filter(b => (b as any).status === "TERSEDIA").length;
  const countDipinjam = barang.filter(b => (b as any).status === "DIPINJAM").length;
  const countRusak    = barang.filter(b => b.kondisi !== "BAIK").length;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <Link href="/petugas/dashboard" style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
            Dashboard
          </Link>
        </div>
        <h1 className="page-title">Daftar Barang</h1>
        <p className="page-sub">Inventaris aset FTI UKSW · Status ketersediaan real-time</p>
      </div>

      {/* Summary cards — grid-3 → 2col @860px → 1col @640px */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Tersedia",    value: countTersedia, icon: "ti-circle-check",  badge: "badge-ok" },
          { label: "Dipinjam",   value: countDipinjam,  icon: "ti-arrows-exchange", badge: "badge-warn" },
          { label: "Perlu Cek",  value: countRusak,     icon: "ti-alert-circle",  badge: "badge-danger" },
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

      {/* Filter bar */}
      <div className="glass" style={{ padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Cari nama atau kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter status */}
          <select
            className="select"
            style={{ flex: "0 1 140px" }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="tersedia">Tersedia</option>
            <option value="dipinjam">Dipinjam</option>
            <option value="semua">Semua Status</option>
          </select>

          {/* Filter kategori */}
          <select
            className="select"
            style={{ flex: "0 1 160px" }}
            value={filterKat}
            onChange={e => setFilterKat(e.target.value)}
          >
            <option value="semua">Semua Kategori</option>
            {kategori.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>

          {/* Filter kondisi */}
          <select
            className="select"
            style={{ flex: "0 1 150px" }}
            value={filterKond}
            onChange={e => setFilterKond(e.target.value)}
          >
            <option value="semua">Semua Kondisi</option>
            <option value="BAIK">Baik</option>
            <option value="RUSAK_RINGAN">Rusak Ringan</option>
            <option value="RUSAK_BERAT">Rusak Berat</option>
          </select>

          {/* Reset */}
          {(search || filterKat !== "semua" || filterKond !== "semua" || filterStatus !== "tersedia") && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setFilterKat("semua"); setFilterKond("semua"); setFilterStatus("tersedia"); }}
            >
              <i className="ti ti-x" style={{ fontSize: 13 }} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-muted)", paddingLeft: 2 }}>
        Menampilkan <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{filtered.length}</span> dari {barang.length} barang
      </div>

      {/* Table */}
      <div className="glass">
        {loading ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div className="spinner" />
            Memuat data barang...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Nama Barang</th>
                  <th style={{ width: "15%" }}>Kode</th>
                  <th style={{ width: "20%" }}>Kategori</th>
                  <th style={{ width: "15%" }}>Kondisi</th>
                  <th style={{ width: "15%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: "36px 0" }}>
                        <i className="ti ti-mood-empty" style={{ fontSize: 28 }} />
                        Tidak ada barang yang sesuai filter
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(b => {
                  const statusVal  = (b as any).status ?? "TERSEDIA";
                  const isDipinjam = statusVal === "DIPINJAM";
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div>
                        {b.ruangan && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {b.ruangan.nama}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                        {b.kodeBarang}
                      </td>
                      <td style={{ fontSize: 12 }}>{b.kategori?.nama ?? "—"}</td>
                      <td>
                        <span className={`badge ${KONDISI_BADGE[b.kondisi] ?? "badge-muted"}`}>
                          {KONDISI_LABEL[b.kondisi] ?? b.kondisi}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isDipinjam ? "badge-warn" : "badge-ok"}`}>
                          {isDipinjam ? "Dipinjam" : "Tersedia"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer CTA */}
        {!loading && filtered.some(b => (b as any).status !== "DIPINJAM") && (
          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10 }}>
            <Link href="/petugas/pinjam" className="btn btn-primary btn-sm">
              <i className="ti ti-arrow-bar-to-down" style={{ fontSize: 14 }} />
              Pinjam Barang
            </Link>
            <Link href="/petugas/pinjam?mode=scan" className="btn btn-ghost btn-sm">
              <i className="ti ti-qrcode" style={{ fontSize: 14 }} />
              Scan QR
            </Link>
          </div>
        )}
      </div>
    </>
  );
}