"use client";

import { useState, useEffect, useMemo } from "react";
import type { Barang } from "@/types";

interface FullTablePreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FullTablePreview({ isOpen, onClose }: FullTablePreviewProps) {
  const [data, setData] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<keyof Barang>("tanggalDatang");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = (reset = true) => {
    if (!isOpen) return;
    const cur = reset ? null : cursor;
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (cur) params.set("cursor", cur);

    if (reset) setLoading(true);
    else setLoadingMore(true);

    fetch(`/api/barang?${params}`)
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          if (reset) setData(json.data);
          else setData(prev => [...prev, ...json.data]);
          setCursor(json.nextCursor);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      });
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      load(true);
    }, 300);
    return () => clearTimeout(delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, search]);

  // Local sorting so it behaves instantly like a spreadsheet
  const filteredAndSorted = useMemo(() => {
    let list = [...data];

    // Sort
    list.sort((a, b) => {
      let valA: any = a[sortBy] ?? "";
      let valB: any = b[sortBy] ?? "";

      if (sortBy === "kategoriId") {
        valA = a.kategori?.nama || "";
        valB = b.kategori?.nama || "";
      } else if (sortBy === "ruanganId") {
        valA = a.ruangan?.kode || "";
        valB = b.ruangan?.kode || "";
      } else if (sortBy === "tanggalDatang" || sortBy === "tanggalPindah") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, sortBy, sortDir]);

  // Lock ALL scroll behind overlay (html + body)
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSort = (field: keyof Barang) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (field: keyof Barang) => {
    if (sortBy !== field) return <i className="ti ti-arrows-sort text-muted" style={{ fontSize: 14, opacity: 0.3 }} />;
    return <i className={`ti ti-sort-${sortDir === "asc" ? "ascending" : "descending"}`} style={{ fontSize: 14, color: "var(--color-info)" }} />;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col animate-in fade-in zoom-in-95 duration-200"
      style={{ background: "rgba(5,5,8,0.97)", backdropFilter: "blur(24px)" }}
    >
      {/* ─── Dynamic Island Search ─── */}
      <div
        className="w-full flex justify-center shrink-0 relative group"
        style={{ paddingTop: 28, paddingBottom: 20, paddingLeft: 16, paddingRight: 16 }}
      >
        <div
          className="flex items-center justify-center w-full"
          style={{ maxWidth: 440 }}
        >
          {/* Back Button */}
          <button
            className="btn btn-ghost btn-icon shrink-0"
            style={{
              marginRight: 12,
              background: "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              borderRadius: "50%",
              width: 44,
              height: 44,
            }}
            onClick={onClose}
            title="Kembali"
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 22 }} />
          </button>

          {/* Search Pill */}
          <div
            className="relative flex-1 flex items-center rounded-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              height: 40,
              background: "rgba(18,18,18,0.92)",
              backdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Faint hint arrow (visible when buttons hidden) */}
            <div
              className="absolute flex items-center justify-center pointer-events-none transition-opacity duration-300"
              style={{ left: 14, opacity: 0.35 }}
              data-hint="back"
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }} />
            </div>

            {/* Icon + Input centered together */}
            <div className="flex items-center justify-center w-full h-full">
              <i className="ti ti-search" style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              <input
                className="bg-transparent border-none outline-none"
                style={{
                  fontSize: 13,
                  color: "#fff",
                  width: 190,
                  marginLeft: 8,
                }}
                placeholder="Cari data spreadsheet..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {loading && <i className="ti ti-loader animate-spin" style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginLeft: 8, flexShrink: 0 }} />}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Spreadsheet Table ─── */}
      <div className="flex-1 overflow-auto" style={{ padding: "0 16px 24px" }}>
        <table className="table" style={{ minWidth: 2000 }}>
          <thead
            className="sticky top-0 z-10"
            style={{
              background: "rgba(12,12,16,0.98)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <tr>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("id")}>No {renderSortIcon("id")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("kategoriId")}>Kategori {renderSortIcon("kategoriId")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("label")}>Label {renderSortIcon("label")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("sn")}>SN {renderSortIcon("sn")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("labelAset")}>Label Aset {renderSortIcon("labelAset")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("merek")}>Merk {renderSortIcon("merek")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("model")}>Model {renderSortIcon("model")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("tipe")}>Type {renderSortIcon("tipe")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("ruanganId")}>Ruangan {renderSortIcon("ruanganId")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("harga")}>Harga {renderSortIcon("harga")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("sumberTahun")}>Tahun File {renderSortIcon("sumberTahun")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("tanggalDatang")}>Tgl Datang {renderSortIcon("tanggalDatang")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("tanggalPindah")}>Tgl Pindah {renderSortIcon("tanggalPindah")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("kondisi")}>Kondisi {renderSortIcon("kondisi")}</th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("status")}>Status {renderSortIcon("status")}</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr><td colSpan={16} className="text-center py-10 text-muted">Tidak ada data yang cocok dengan pencarian</td></tr>
            ) : filteredAndSorted.map((b, i) => (
              <tr key={b.id}>
                <td className="td-sm text-muted">{i + 1}</td>
                <td className="td-sm font-medium">{b.kategori?.nama || "-"}</td>
                <td className="td-code">{b.label || "-"}</td>
                <td className="td-code">{b.sn || "-"}</td>
                <td className="td-code">{b.labelAset || "-"}</td>
                <td className="td-sm">{b.merek || "-"}</td>
                <td className="td-sm">{b.model || "-"}</td>
                <td className="td-sm">{b.tipe || "-"}</td>
                <td className="td-sm font-medium text-info">{b.ruangan?.kode || "-"}</td>
                <td className="td-sm">{b.harga ? `Rp ${b.harga.toLocaleString("id-ID")}` : "-"}</td>
                <td className="td-sm">{b.sumberTahun || "-"}</td>
                <td className="td-sm text-muted">{b.tanggalDatang ? new Date(b.tanggalDatang).toLocaleDateString("id-ID") : "-"}</td>
                <td className="td-sm text-muted">{b.tanggalPindah ? new Date(b.tanggalPindah).toLocaleDateString("id-ID") : "-"}</td>
                <td><span className={`badge ${b.kondisi === "BAIK" ? "badge-ok" : "badge-warn"}`}>{b.kondisi.replace(/_/g, " ")}</span></td>
                <td><span className={`badge ${b.status === "TERSEDIA" ? "badge-ok" : "badge-muted"}`}>{b.status}</span></td>
                <td className="td-sm max-w-[200px] truncate" title={b.keterangan || ""}>{b.keterangan || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cursor && (
          <div style={{ padding: "16px", textAlign: "center" }}>
            <button className="btn btn-ghost" onClick={() => load(false)} disabled={loadingMore}>
              {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
            </button>
          </div>
        )}
      </div>

      {/* Hide back button hint & show real button on group hover via CSS */}
      <style jsx>{`
        .group:hover button[title="Kembali"] {
          width: 40px !important;
          opacity: 1 !important;
        }
        .group:hover [data-hint="back"] {
          opacity: 0 !important;
        }
      `}</style>
    </div>
  );
}
