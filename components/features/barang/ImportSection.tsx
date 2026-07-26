// components/features/barang/ImportSection.tsx
"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import ImportDraftView from "@/components/features/ImportDraftView";
import type { DraftRow } from "@/components/features/ImportDraftView";

/** Import CSV/Excel section: file upload, preview, and push */
export default function ImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [draftData, setDraftData] = useState<{ valid: DraftRow[]; error: DraftRow[]; sumberTahun: string; total: number } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: string[], updated: string[], skipped: string[], errors: { label?: string, reason?: string }[] } | null>(null);

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

  async function handlePush(validData: DraftRow[]) {
    setPushing(true);
    try {
      const res = await fetch("/api/barang/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: validData, fileName: file?.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal push ke database");
      
      toast.success("Import selesai");
      setImportResult(data.stats);
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
      {importResult ? (
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-check" style={{ color: "var(--color-ok)" }} /> 
            Laporan Hasil Import (Transparan)
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
            Berikut adalah rincian data yang berhasil diproses ke database. Kami memisahkan data baru, data yang diperbarui, dan data yang tidak mengalami perubahan.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Inserted */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(125,212,168,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="ti ti-plus" style={{ color: "var(--color-ok)" }} />
                <span style={{ fontWeight: 600 }}>Data Baru (Berhasil Ditambah)</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "var(--color-ok)", marginBottom: 8 }}>
                {importResult.inserted.length} <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}>item</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", maxHeight: 100, overflowY: "auto", paddingRight: 8, lineHeight: 1.5 }}>
                {importResult.inserted.length > 0 ? importResult.inserted.join(", ") : "-"}
              </div>
            </div>

            {/* Updated */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(100,180,255,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="ti ti-refresh" style={{ color: "var(--color-info)" }} />
                <span style={{ fontWeight: 600 }}>Data Lama (Berhasil Diperbarui)</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "var(--color-info)", marginBottom: 8 }}>
                {importResult.updated.length} <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}>item</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", maxHeight: 100, overflowY: "auto", paddingRight: 8, lineHeight: 1.5 }}>
                {importResult.updated.length > 0 ? importResult.updated.join(", ") : "-"}
              </div>
            </div>

            {/* Skipped */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="ti ti-player-skip-forward" style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontWeight: 600 }}>Dilewati (Tidak Ada Perubahan)</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "var(--text-secondary)", marginBottom: 8 }}>
                {importResult.skipped.length} <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}>item</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", maxHeight: 100, overflowY: "auto", paddingRight: 8, lineHeight: 1.5 }}>
                {importResult.skipped.length > 0 ? importResult.skipped.join(", ") : "-"}
              </div>
            </div>

            {/* Errors */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(240,128,112,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="ti ti-alert-triangle" style={{ color: "var(--color-err)" }} />
                <span style={{ fontWeight: 600 }}>Gagal / Error</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "var(--color-err)", marginBottom: 8 }}>
                {importResult.errors.length} <span style={{ fontSize: 12, fontWeight: "normal", color: "var(--text-muted)" }}>item</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", maxHeight: 100, overflowY: "auto", paddingRight: 8, lineHeight: 1.5 }}>
                {importResult.errors.length > 0 ? importResult.errors.map((e: { label?: string, reason?: string }, i: number) => (
                  <div key={i}><strong>{e.label}:</strong> {e.reason}</div>
                )) : "-"}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setImportResult(null)}>
            Tutup Laporan
          </button>
        </div>
      ) : !draftData ? (
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
