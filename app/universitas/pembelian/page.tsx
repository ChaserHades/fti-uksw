"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/helpers/api";
import { fDateShort, fCurrency } from "@/helpers/format";
import type { Barang, KategoriBarang } from "@/types";

export default function PembelianPage() {
  const [barang,   setBarang]   = useState<Barang[]>([]);
  const [kategori, setKategori] = useState<KategoriBarang[]>([]);
  const [search,   setSearch]   = useState("");
  const [filterKat,setFilterKat]= useState("");
  const [filterThn,setFilterThn]= useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search)    p.set("search", search);
    if (filterKat) p.set("kategoriId", filterKat);
    api.get<Barang[]>(`/api/barang?${p}`).then(setBarang).catch(console.error);
  }, [search, filterKat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get<KategoriBarang[]>("/api/kategori").then(setKategori); }, []);

  const filtered = filterThn
    ? barang.filter(b => b.tahunBeli?.toString() === filterThn)
    : barang;

  const withHarga = filtered.filter(b => b.harga && b.harga > 0);
  const totalNilai = withHarga.reduce((sum, b) => sum + (b.harga ?? 0) * b.jumlah, 0);

  const tahunList = [...new Set(barang.map(b => b.tahunBeli).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0));

  function exportCSV() {
    const headers = ["Kode", "Nama", "Kategori", "Kondisi", "Jumlah", "Tahun Beli", "Harga Satuan", "Total Nilai"];
    const rows = filtered.map(b => [
      b.kodeBarang, b.nama, b.kategori?.nama ?? "",
      b.kondisi.replace(/_/g, " "),
      b.jumlah,
      b.tahunBeli ?? "",
      b.harga ?? "",
      b.harga ? b.harga * b.jumlah : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `pembelian-aset-fti-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Pembelian & Anggaran Aset" subtitle="Transparansi penggunaan anggaran FTI UKSW">
        <button className="btn btn-primary" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[
          { label: "Total Item",      value: filtered.length,           color: "var(--ds-mist)" },
          { label: "Ada Harga",       value: withHarga.length,          color: "var(--color-ok)" },
          { label: "Total Nilai",     value: fCurrency(totalNilai),     color: "var(--color-warn)" },
          { label: "Rata-rata",       value: withHarga.length > 0 ? fCurrency(Math.round(totalNilai / withHarga.length)) : "—", color: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.label} className="glass stat-card">
            <div className="stat-card-header">
              <span className="section-label">{s.label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1.3 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Cari nama barang…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select className="select" style={{ width: 140 }} value={filterThn} onChange={e => setFilterThn(e.target.value)}>
          <option value="">Semua Tahun</option>
          {tahunList.map(t => <option key={t} value={t!}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Nama Barang</th>
                <th style={{ width: "15%" }}>Kategori</th>
                <th style={{ width: "12%" }}>Kondisi</th>
                <th style={{ width: "8%" }}>Jml</th>
                <th style={{ width: "10%" }}>Tahun</th>
                <th style={{ width: "13%" }}>Harga Satuan</th>
                <th style={{ width: "12%" }}>Total Nilai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="ti ti-receipt-off" style={{ fontSize: 28 }} />Tidak ada data
                    </div>
                  </td>
                </tr>
              ) : filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{b.kodeBarang}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{b.kategori?.nama ?? "—"}</td>
                  <td>
                    <span className={`badge ${b.kondisi === "BAIK" ? "badge-ok" : b.kondisi === "RUSAK_RINGAN" ? "badge-warn" : "badge-danger"}`}>
                      {b.kondisi.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.jumlah}</td>
                  <td style={{ fontSize: 12 }}>{b.tahunBeli ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>
                    {b.harga ? fCurrency(b.harga) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, fontWeight: 500, color: "var(--color-ok)" }}>
                    {b.harga ? fCurrency(b.harga * b.jumlah) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}