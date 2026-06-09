// app/universitas/pembelian/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/helpers/api";

// ─── Types ────────────────────────────────────────────────────────────────────
// Extend Barang dengan field pembelian. Sesuaikan dengan Prisma schema kamu:
// Barang { ..., hargaBeli: Int?, tanggalBeli: DateTime?, sumberDana: String? }
interface PembelianBarang {
  id:           string;
  nama:         string;
  kodeBarang:   string;
  hargaBeli:    number | null;
  tanggalBeli:  string | null;
  sumberDana:   string | null;   // "DIPA", "BLU", "Hibah", dst.
  kondisi:      string;
  kategori:     { nama: string };
  ruangan?:     { nama: string } | null;
}

interface Kategori { id: string; nama: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style:    "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

function fDate(raw: string | null): string {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const SUMBER_BADGE: Record<string, string> = {
  DIPA:   "badge-info",
  BLU:    "badge-ok",
  HIBAH:  "badge-warn",
  MANDIRI: "badge-muted",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PembelianPage() {
  const [items,    setItems]    = useState<PembelianBarang[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [search,     setSearch]     = useState("");
  const [filterKat,  setFilterKat]  = useState("semua");
  const [filterSumber, setFilterSumber] = useState("semua");
  const [filterTahun,  setFilterTahun]  = useState("semua");

  useEffect(() => {
    Promise.all([
      // Endpoint ini perlu mengembalikan barang yang memiliki tanggalBeli
      api.get<PembelianBarang[]>("/api/barang?withPembelian=true"),
      api.get<Kategori[]>("/api/kategori"),
    ]).then(([b, k]) => {
      // Urutkan terbaru dulu
      const sorted = [...b].sort((a, z) => {
        if (!a.tanggalBeli) return 1;
        if (!z.tanggalBeli) return -1;
        return new Date(z.tanggalBeli).getTime() - new Date(a.tanggalBeli).getTime();
      });
      setItems(sorted);
      setKategori(k);
    }).finally(() => setLoading(false));
  }, []);

  // Daftar tahun unik dari data
  const tahunList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.tanggalBeli) set.add(new Date(i.tanggalBeli).getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [items]);

  // Daftar sumber dana unik
  const sumberList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.sumberDana) set.add(i.sumberDana); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(b => {
      const matchSearch  = b.nama.toLowerCase().includes(search.toLowerCase()) ||
                           b.kodeBarang.toLowerCase().includes(search.toLowerCase());
      const matchKat     = filterKat    === "semua" || b.kategori?.nama === filterKat;
      const matchSumber  = filterSumber === "semua" || b.sumberDana === filterSumber;
      const matchTahun   = filterTahun  === "semua" || (
        b.tanggalBeli && new Date(b.tanggalBeli).getFullYear().toString() === filterTahun
      );
      return matchSearch && matchKat && matchSumber && matchTahun;
    });
  }, [items, search, filterKat, filterSumber, filterTahun]);

  // Summary stats
  const totalAnggaran = filtered.reduce((sum, b) => sum + (b.hargaBeli ?? 0), 0);
  const totalItems    = filtered.length;
  const rataRata      = totalItems > 0 ? Math.round(totalAnggaran / totalItems) : 0;
  const terbaru       = filtered.find(b => b.tanggalBeli);

  const isFiltered = search || filterKat !== "semua" || filterSumber !== "semua" || filterTahun !== "semua";

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Link href="/universitas/dashboard"
            style={{ color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
            Dashboard
          </Link>
        </div>
        <h1 className="page-title">Pembelian Barang</h1>
        <p className="page-sub">Transparansi penggunaan anggaran pengadaan aset FTI UKSW</p>
      </div>

      {/* Summary stat cards — grid-4 → 2col @1100px → 1col @640px */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="glass stat-card">
          <div className="stat-card-header">
            <span className="section-label">Total Anggaran</span>
            <i className="ti ti-cash" style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
          </div>
          <div className="stat-value" style={{ fontSize: "clamp(14px,3vw,20px)" }}>
            {fCurrency(totalAnggaran)}
          </div>
          <div className="stat-card-footer">
            <span className="stat-delta">{isFiltered ? "Hasil filter" : "Semua data"}</span>
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-card-header">
            <span className="section-label">Jumlah Barang</span>
            <i className="ti ti-box" style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
          </div>
          <div className="stat-value">{totalItems}</div>
          <div className="stat-card-footer">
            <span className="stat-delta">item tercatat</span>
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-card-header">
            <span className="section-label">Rata-rata Harga</span>
            <i className="ti ti-chart-bar" style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
          </div>
          <div className="stat-value" style={{ fontSize: "clamp(14px,3vw,20px)" }}>
            {fCurrency(rataRata || null)}
          </div>
          <div className="stat-card-footer">
            <span className="stat-delta">per item</span>
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-card-header">
            <span className="section-label">Pembelian Terbaru</span>
            <i className="ti ti-calendar" style={{ fontSize: 18, color: "var(--ds-mist)", flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>
            {terbaru ? fDate(terbaru.tanggalBeli) : "—"}
          </div>
          <div className="stat-card-footer">
            <span className="stat-delta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {terbaru?.nama ?? "Belum ada data"}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown sumber dana */}
      {sumberList.length > 0 && (
        <div className="glass" style={{ padding: "18px 20px", marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-label">Breakdown Sumber Dana</span>
            <span className="badge badge-muted">{filterTahun !== "semua" ? filterTahun : "Semua tahun"}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {sumberList.map(s => {
              const sItems = filtered.filter(b => b.sumberDana === s);
              const sTotal = sItems.reduce((sum, b) => sum + (b.hargaBeli ?? 0), 0);
              const pct    = totalAnggaran > 0 ? Math.round((sTotal / totalAnggaran) * 100) : 0;
              return (
                <div key={s} style={{ flex: "1 1 180px", padding: "12px 14px", background: "rgba(65,90,119,0.2)", borderRadius: 12, border: "1px solid var(--glass-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className={`badge ${SUMBER_BADGE[s] ?? "badge-muted"}`}>{s}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                    {fCurrency(sTotal)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sItems.length} item</div>
                  <div className="bar-track" style={{ marginTop: 8 }}>
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          {/* Filter tahun */}
          <select className="select" style={{ flex: "0 1 120px" }} value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
            <option value="semua">Semua Tahun</option>
            {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Filter sumber dana */}
          <select className="select" style={{ flex: "0 1 140px" }} value={filterSumber} onChange={e => setFilterSumber(e.target.value)}>
            <option value="semua">Semua Sumber</option>
            {sumberList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Filter kategori */}
          <select className="select" style={{ flex: "0 1 160px" }} value={filterKat} onChange={e => setFilterKat(e.target.value)}>
            <option value="semua">Semua Kategori</option>
            {kategori.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
          </select>

          {/* Reset */}
          {isFiltered && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setFilterKat("semua"); setFilterSumber("semua"); setFilterTahun("semua"); }}>
              <i className="ti ti-x" style={{ fontSize: 13 }} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Result info */}
      <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-muted)", paddingLeft: 2 }}>
        Menampilkan <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{filtered.length}</span> dari {items.length} item
        {isFiltered && totalAnggaran > 0 && (
          <span> · Total: <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>{fCurrency(totalAnggaran)}</span></span>
        )}
      </div>

      {/* Table */}
      <div className="glass">
        {loading ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div className="spinner" />
            Memuat data pembelian...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Nama Barang</th>
                  <th style={{ width: "13%" }}>Kode</th>
                  <th style={{ width: "16%" }}>Kategori</th>
                  <th style={{ width: "16%" }}>Tanggal Beli</th>
                  <th style={{ width: "18%" }}>Harga Beli</th>
                  <th style={{ width: "9%" }}>Sumber</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: "36px 0" }}>
                        <i className="ti ti-receipt-off" style={{ fontSize: 28 }} />
                        Tidak ada data pembelian yang sesuai filter
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(b => (
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
                    <td style={{ fontSize: 12 }}>{fDate(b.tanggalBeli)}</td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600, color: b.hargaBeli ? "var(--color-ok)" : "var(--text-muted)" }}>
                        {fCurrency(b.hargaBeli)}
                      </span>
                    </td>
                    <td>
                      {b.sumberDana ? (
                        <span className={`badge ${SUMBER_BADGE[b.sumberDana] ?? "badge-muted"}`}>
                          {b.sumberDana}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer total */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{filtered.length}</span> item ·
              Total anggaran: <span style={{ fontWeight: 700, color: "var(--color-ok)" }}>{fCurrency(totalAnggaran)}</span>
            </div>
            <Link href="/universitas/barang" className="btn btn-ghost btn-sm">
              <i className="ti ti-external-link" style={{ fontSize: 13 }} />
              Lihat Semua Aset
            </Link>
          </div>
        )}
      </div>
    </>
  );
}