"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/helpers/api";
import type { Barang, KategoriBarang } from "@/types";

export default function ListBarangPage() {
  const [barang,   setBarang]   = useState<Barang[]>([]);
  const [kategori, setKategori] = useState<KategoriBarang[]>([]);
  const [search,   setSearch]   = useState("");
  const [filterKat,setFilterKat]= useState("");
  const [filterKon,setFilterKon]= useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search)    p.set("search", search);
    if (filterKat) p.set("kategoriId", filterKat);
    api.get<Barang[]>(`/api/barang?${p}`)
      .then(d => setBarang(d.filter(b => b.status === "TERSEDIA")))
      .catch(console.error);
  }, [search, filterKat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get<KategoriBarang[]>("/api/kategori").then(setKategori); }, []);

  const filtered = filterKon
    ? barang.filter(b => b.kondisi === filterKon)
    : barang;

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };
  const kondisiLabel: Record<string, string> = {
    BAIK: "Baik", RUSAK_RINGAN: "Rusak Ringan", RUSAK_BERAT: "Rusak Berat",
  };

  return (
    <>
      <PageHeader title="Barang Tersedia" subtitle={`${filtered.length} barang siap dipinjam`}>
        <Link href="/petugas/pinjam" className="btn btn-primary">
          <i className="ti ti-arrow-bar-to-down" /> Pinjam Sekarang
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="glass" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }} />
          <input
            className="input" style={{ paddingLeft: 36 }}
            placeholder="Cari nama barang…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 180 }} value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select className="select" style={{ width: 160 }} value={filterKon} onChange={e => setFilterKon(e.target.value)}>
          <option value="">Semua Kondisi</option>
          <option value="BAIK">Baik</option>
          <option value="RUSAK_RINGAN">Rusak Ringan</option>
          <option value="RUSAK_BERAT">Rusak Berat</option>
        </select>
      </div>

      {/* Summary badges */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: "Tersedia",      val: barang.length,                                         cls: "badge-ok" },
          { label: "Kondisi Baik",  val: barang.filter(b => b.kondisi === "BAIK").length,        cls: "badge-ok" },
          { label: "Perlu Periksa", val: barang.filter(b => b.kondisi !== "BAIK").length,        cls: "badge-warn" },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.cls}`} style={{ fontSize: 14, fontWeight: 700, padding: "4px 14px" }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Nama Barang</th>
                <th style={{ width: "18%" }}>Kategori</th>
                <th style={{ width: "15%" }}>Kondisi</th>
                <th style={{ width: "12%" }}>Jumlah</th>
                <th style={{ width: "20%" }}>Ruangan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <i className="ti ti-box-off" style={{ fontSize: 30 }} />
                      Tidak ada barang tersedia
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
                    <span className={`badge ${kondisiBadge[b.kondisi]}`}>{kondisiLabel[b.kondisi]}</span>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{b.jumlah}</td>
                  <td style={{ fontSize: 12 }}>{b.ruangan?.nama ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}