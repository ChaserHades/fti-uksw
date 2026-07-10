"use client";

import React, { useState } from "react";
import Modal from "@/components/Modal";
import LiquidSelect from "@/components/LiquidSelect";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  kategoriList: { id: string; nama: string }[];
}

export default function ExportModal({ open, onClose, kategoriList }: ExportModalProps) {
  const [exportType, setExportType] = useState<"all" | "filter">("all");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [filterKat, setFilterKat] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterRuangan, setFilterRuangan] = useState("");
  
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("format", format);
      q.set("type", exportType);
      
      if (exportType === "filter") {
        if (filterKat) q.set("kategoriId", filterKat);
        if (filterSearch) q.set("search", filterSearch);
        if (filterVendor) q.set("vendor", filterVendor);
        if (filterRuangan) q.set("ruangan", filterRuangan);
        q.set("sortBy", sortBy);
        q.set("sortDir", sortDir);
      } else {
        // even for 'all', maybe they want sorted
        q.set("sortBy", sortBy);
        q.set("sortDir", sortDir);
      }

      const res = await fetch(`/api/barang/export?${q.toString()}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal export");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      a.download = `Export_Aset_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sortOptions = [
    { value: "createdAt", label: "Tanggal Dibuat" },
    { value: "tanggalDatang", label: "Tanggal Datang" },
    { value: "tanggalPindah", label: "Tanggal Pindah" },
    { value: "nama", label: "Nama Barang" },
    { value: "kategori", label: "Kategori" },
    { value: "vendor", label: "Vendor" },
    { value: "ruangan", label: "Ruangan/Ruangan" },
  ];

  const isDateSort = ["createdAt", "tanggalDatang", "tanggalPindah"].includes(sortBy);

  return (
    <Modal open={open} onClose={onClose} title="Export Data Barang (Custom Report)">
      <div className="form-group">
        <label className="form-label">Tipe Export</label>
        <div style={{ display: "flex", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="radio" name="exportType" checked={exportType === "all"} onChange={() => setExportType("all")} />
            Semua Data (Bulk)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="radio" name="exportType" checked={exportType === "filter"} onChange={() => setExportType("filter")} />
            Gunakan Filter & Sort
          </label>
        </div>
      </div>

      {exportType === "filter" && (
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Cari Global (Regex/Text)</label>
              <input className="input" placeholder="Cari Label, SN, Nama..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Filter Kategori</label>
              <LiquidSelect
                value={filterKat}
                onChange={setFilterKat}
                options={[
                  { value: "", label: "Semua Jenis" },
                  ...kategoriList.map(k => ({ value: k.id, label: k.nama }))
                ]}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Filter Vendor</label>
              <input className="input" placeholder="Nama vendor..." value={filterVendor} onChange={e => setFilterVendor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Filter Ruangan</label>
              <input className="input" placeholder="Kode Ruangan..." value={filterRuangan} onChange={e => setFilterRuangan(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Sort Berdasarkan</label>
          <LiquidSelect
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Arah Sortir</label>
          <LiquidSelect
            value={sortDir}
            onChange={(v: any) => setSortDir(v)}
            options={[
              { value: "desc", label: isDateSort ? "Terbaru (Newest)" : "Z-A (Descending)" },
              { value: "asc", label: isDateSort ? "Terlama (Oldest)" : "A-Z (Ascending)" }
            ]}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Format Output</label>
        <div style={{ display: "flex", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="radio" name="format" checked={format === "xlsx"} onChange={() => setFormat("xlsx")} />
            Excel (.xlsx)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="radio" name="format" checked={format === "csv"} onChange={() => setFormat("csv")} />
            CSV (.csv)
          </label>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
        <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
          {loading ? "Mengekspor..." : `Download ${format.toUpperCase()}`}
        </button>
      </div>
    </Modal>
  );
}
