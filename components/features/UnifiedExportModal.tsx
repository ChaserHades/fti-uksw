import React, { useState } from "react";
import Modal from "@/components/Modal";

export type ExportType = "ASET" | "RIWAYAT" | "CASHFLOW";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportMode = "ALL" | "TODAY" | "SELECTED";

export interface UnifiedExportModalProps {
  open: boolean;
  onClose: () => void;
  type: ExportType;
  onExport: (format: ExportFormat, mode: ExportMode) => void;
  hasSelection?: boolean;
  selectionCount?: number;
  onSearchSelection?: () => void; // Triggered if they want to export selected, but we need them to pick first
}

export default function UnifiedExportModal({
  open,
  onClose,
  type,
  onExport,
  hasSelection = false,
  selectionCount = 0,
  onSearchSelection,
}: UnifiedExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Export Data ${type === "ASET" ? "Aset" : type === "RIWAYAT" ? "Riwayat Peminjaman" : "Laporan Keuangan"}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
        
        {/* Format Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Format File</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className={`bento-card ${format === "xlsx" ? "ring-2 ring-primary" : ""}`} style={{ padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: format === "xlsx" ? "rgba(255,255,255,0.08)" : "var(--glass-bg)" }}>
              <input type="radio" name="format" value="xlsx" checked={format === "xlsx"} onChange={() => setFormat("xlsx")} style={{ display: "none" }} />
              <div className="qa-card-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                <i className="ti ti-file-spreadsheet" />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600 }}>Excel (.xlsx)</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Format laporan standar</span>
              </div>
            </label>

            <label className={`bento-card ${format === "csv" ? "ring-2 ring-primary" : ""}`} style={{ padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: format === "csv" ? "rgba(255,255,255,0.08)" : "var(--glass-bg)" }}>
              <input type="radio" name="format" value="csv" checked={format === "csv"} onChange={() => setFormat("csv")} style={{ display: "none" }} />
              <div className="qa-card-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3B82F6" }}>
                <i className="ti ti-file-text" />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600 }}>CSV (.csv)</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Format teks ringan</span>
              </div>
            </label>
            
            {type === "CASHFLOW" && (
              <label className={`bento-card ${format === "pdf" ? "ring-2 ring-primary" : ""}`} style={{ padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: format === "pdf" ? "rgba(255,255,255,0.08)" : "var(--glass-bg)" }}>
                <input type="radio" name="format" value="pdf" checked={format === "pdf"} onChange={() => setFormat("pdf")} style={{ display: "none" }} />
                <div className="qa-card-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}>
                  <i className="ti ti-file-type-pdf" />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600 }}>PDF (.pdf)</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Format dokumen siap cetak</span>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Scope Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Lingkup Data</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            
            <button className="bento-card hover-glow" style={{ padding: 16, textAlign: "left", display: "flex", alignItems: "center", gap: 16 }} onClick={() => onExport(format, "TODAY")}>
              <i className="ti ti-calendar" style={{ fontSize: 24, color: "var(--color-info)" }} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontWeight: 600 }}>Data Hari Ini</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ekspor transaksi/data hari ini saja</span>
              </div>
              <i className="ti ti-chevron-right" style={{ color: "var(--text-secondary)" }} />
            </button>

            {hasSelection && (
              <button className="bento-card hover-glow" style={{ padding: 16, textAlign: "left", display: "flex", alignItems: "center", gap: 16 }} onClick={() => {
                if (selectionCount > 0) onExport(format, "SELECTED");
                else if (onSearchSelection) onSearchSelection();
              }}>
                <i className="ti ti-checkbox" style={{ fontSize: 24, color: "var(--ds-mist)" }} />
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Data Pilihan</span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {selectionCount > 0 ? `Ekspor ${selectionCount} data yang dipilih` : "Cari dan pilih data yang ingin diekspor"}
                  </span>
                </div>
                <i className="ti ti-chevron-right" style={{ color: "var(--text-secondary)" }} />
              </button>
            )}

            <button className="bento-card hover-glow" style={{ padding: 16, textAlign: "left", display: "flex", alignItems: "center", gap: 16 }} onClick={() => onExport(format, "ALL")}>
              <i className="ti ti-database" style={{ fontSize: 24, color: "var(--color-warn)" }} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontWeight: 600 }}>Seluruh Database</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ekspor seluruh data (mungkin memakan waktu)</span>
              </div>
              <i className="ti ti-chevron-right" style={{ color: "var(--text-secondary)" }} />
            </button>

          </div>
        </div>
      </div>
    </Modal>
  );
}
