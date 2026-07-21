// components/features/barang/ImportSection.tsx
"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import ImportDraftView from "@/components/features/ImportDraftView";

/** Import CSV/Excel section — file upload → preview → push */
export default function ImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [draftData, setDraftData] = useState<{ valid: any[]; error: any[]; sumberTahun: string; total: number } | null>(null);
  const [pushing, setPushing] = useState(false);

  async function handlePreview() {
    if (!file) { toast.error("Pilih file terlebih dahulu"); return; }
    setImporting(true);
    setDraftData(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/barang/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal preview data");
      setDraftData(data);
      toast.success("Draft siap direview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses file");
    } finally {
      setImporting(false);
    }
  }

  async function handlePush(validData: any[]) {
    setPushing(true);
    try {
      const res = await fetch("/api/barang/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: validData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal push ke database");
      toast.success(`${data.stats?.inserted + data.stats?.updated} barang berhasil dipush ke database`);
      setDraftData(null);
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal push");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div>
      {!draftData ? (
        <div className="glass" style={{ padding: 24, maxWidth: 800 }}>
          <div className="scan-heading" style={{ marginBottom: 16 }}>
            <div className="scan-title">Import CSV / Excel</div>
            <div className="scan-sub">Unggah file aset. Data akan masuk ke draf (Pre-flight Check) sebelum disimpan permanen.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Pilih File CSV / Excel</label>
            <input
              type="file"
              className="input"
              accept=".csv,.xlsx,.xls"
              onChange={e => { setFile(e.target.files?.[0] ?? null); setDraftData(null); }}
            />
          </div>

          {file && (
            <div className="alert alert-info mb-16" style={{ alignItems: "center" }}>
              <i className="ti ti-file" style={{ flexShrink: 0 }} />
              <div>
                File: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                <div className="text-xs opacity-70 mt-1">Sistem akan mengekstrak tahun otomatis dari nama file.</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={handlePreview} disabled={importing || !file}>
            {importing
              ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</>
              : <><i className="ti ti-file-search" />Review Draft</>}
          </button>
        </div>
      ) : (
        <ImportDraftView
          draftValid={draftData.valid}
          draftError={draftData.error}
          pushing={pushing}
          onCancel={() => { setDraftData(null); setFile(null); }}
          onPush={handlePush}
        />
      )}
    </div>
  );
}
