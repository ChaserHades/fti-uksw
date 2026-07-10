// app/universitas/barang/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import { api } from "@/helpers/api";
import { fCurrency } from "@/helpers/format";
import type { Barang, Kategori } from "@/types";

export default function UniversitasBarangPage() {
  const [barang, setBarang]     = useState<Barang[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [search, setSearch]     = useState("");
  const [filterKat, setFilterKat] = useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filterKat) p.set("kategoriId", filterKat);
    api.get<Barang[]>(`/api/barang?${p}`).then(setBarang).catch(console.error);
  }, [search, filterKat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<Kategori[]>("/api/kategori").then(setKategori).catch(console.error);
  }, []);

  const kondisiBadge: Record<string, string> = {
    BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger",
  };
  const statusBadge: Record<string, string> = {
    TERSEDIA: "badge-ok", DIPINJAM: "badge-warn", MAINTENANCE: "badge-muted",
  };

  return (
    <>
      <PageHeader title="Daftar Aset FTI" subtitle="Inventaris lengkap (hanya lihat)" />

      <div className="glass" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }} />
          <input
            className="input" style={{ paddingLeft: 36 }}
            placeholder="Cari nama barang…" value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <LiquidSelect 
          value={filterKat} 
          onChange={(val) => setFilterKat(val)}
          options={[
            { value: "", label: "Semua Kategori" },
            ...kategori.map(k => ({ value: k.id, label: k.nama }))
          ]}
          style={{ width: 200 }}
        />
      </div>

      <div className="glass">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Label</th><th>Nama</th><th>Kategori</th>
                <th>Kondisi</th><th>Status</th><th>Jml</th><th>Harga</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="ti ti-box-off" style={{ fontSize: 28 }} />Tidak ada data
                    </div>
                  </td>
                </tr>
              ) : barang.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>{b.label}</td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</td>
                  <td>{b.kategori.nama}</td>
                  <td><span className={`badge ${kondisiBadge[b.kondisi] ?? "badge-muted"}`}>{b.kondisi.replace("_", " ")}</span></td>
                  <td><span className={`badge ${statusBadge[b.status] ?? "badge-muted"}`}>{b.status}</span></td>
                  <td>{b.jumlah}</td>
                  <td style={{ fontSize: 12 }}>{b.harga ? fCurrency(b.harga) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
