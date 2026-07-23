"use client";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */
interface DraftRow {
  _rowNumber: number;
  _errorReason?: string;
  kategori: string;
  label?: string;
  labelAset?: string;
  sn?: string;
  merek?: string;
  model?: string;
  tipe?: string;
  vendor?: string;
  keterangan?: string;
  kondisi?: string;
  status?: string;
  ruangan?: string;
  tanggalDatang?: string | Date;
  tanggalPindah?: string | Date;
  harga?: number;
  jumlah?: number;
  sumberTahun?: string;
}

interface ImportDraftViewProps {
  draftValid: DraftRow[];
  draftError: DraftRow[];
  onCancel: () => void;
  onPush: (data: DraftRow[]) => void;
  pushing: boolean;
}

/* ═══════════════════════════════════════════════════════════
   Validation
   ═══════════════════════════════════════════════════════════ */
function isValidKategori(str: string | undefined | null): boolean {
  if (!str) return false;
  if (str === "Lainnya") return false;
  const alphanumeric = str.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "");
  return alphanumeric.length >= 2;
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */
export default function ImportDraftView({ draftValid, draftError, onCancel, onPush, pushing }: ImportDraftViewProps) {
  const [tab, setTab] = useState<"error" | "valid">(draftError.length > 0 ? "error" : "valid");
  const [errors, setErrors] = useState<DraftRow[]>(draftError);
  const [valids, setValids] = useState<DraftRow[]>(draftValid);

  // Pagination (Next/Prev)
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  
  useEffect(() => {
    setCurrentPage(0);
  }, [tab]);

  // Skip menu
  const [showSkipMenu, setShowSkipMenu] = useState(false);
  const skipRef = useRef<HTMLDivElement>(null);

  // Confirmation modals (double validation)
  const [confirmAction, setConfirmAction] = useState<"skip-push-all" | "skip-delete" | "push-valid" | "bulk-validate" | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (skipRef.current && !skipRef.current.contains(e.target as Node)) {
        setShowSkipMenu(false);
      }
    }
    if (showSkipMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSkipMenu]);

  /* ── Inline edit: data stays in error tab ── */
  const handleEdit = (index: number, field: keyof DraftRow, value: string) => {
    const updated = [...errors];
    // Convert undefined to empty string to keep controlled input warning away if needed
    updated[index] = { ...updated[index], [field]: value };
    setErrors(updated);
  };

  /* ── Per-row validate (explicit button click) ── */
  const handleValidateRow = (index: number) => {
    const row = errors[index];
    if (!isValidKategori(row.kategori)) {
      toast.error("Kategori harus minimal 2 karakter alfanumerik");
      return;
    }
    const fixed = { ...row };
    delete fixed._errorReason;

    const newErrors = [...errors];
    newErrors.splice(index, 1);

    setValids(prev => [...prev, fixed]);
    setErrors(newErrors);
    toast.success(`Baris ${row._rowNumber} dipindah ke Valid`);
    if (newErrors.length === 0) setTab("valid");
  };

  /* ── Per-row delete ── */
  const handleDeleteRow = (index: number) => {
    const row = errors[index];
    const newErrors = [...errors];
    newErrors.splice(index, 1);
    setErrors(newErrors);
    toast(`Baris ${row._rowNumber} dihapus`, { icon: "🗑️" });
    if (newErrors.length === 0) setTab("valid");
  };

  /* ── Confirmed actions ── */
  const executeConfirmedAction = () => {
    if (confirmAction === "bulk-validate") {
      const fixedErrors = errors.map(e => {
        const r = { ...e };
        delete r._errorReason;
        return r;
      });
      setValids(prev => [...prev, ...fixedErrors]);
      setErrors([]);
      setTab("valid");
      toast.success("Semua data error dipindahkan ke Valid");
    } else if (confirmAction === "skip-push-all") {
      const errorAsLainnya = errors.map(e => {
        const row = { ...e };
        if (!isValidKategori(row.kategori)) row.kategori = "Lainnya";
        delete row._errorReason;
        return row;
      });
      onPush([...valids, ...errorAsLainnya]);
    } else if (confirmAction === "skip-delete") {
      if (valids.length === 0) {
        toast.error("Tidak ada data valid untuk di-push");
        setConfirmAction(null);
        return;
      }
      onPush(valids);
    } else if (confirmAction === "push-valid") {
      onPush(valids);
    }
    setConfirmAction(null);
  };

  const hasErrors = errors.length > 0;
  const currentList = tab === "error" ? errors : valids;
  
  const totalPages = Math.ceil(currentList.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const visibleList = currentList.slice(startIndex, startIndex + itemsPerPage);
  /* ── Confirmation modal messages ── */
  const confirmMessages: Record<string, { title: string; message: React.ReactNode; danger: boolean; label: string }> = {
    "bulk-validate": {
      title: "Validasi Semua Error?",
      message: (
        <div>
          <div style={{ marginBottom: 8 }}><strong>{errors.length} baris</strong> akan dipindahkan ke tab Valid.</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Pastikan Anda sudah memperbaiki kolom-kolom yang diperlukan.</div>
        </div>
      ),
      danger: false,
      label: "Ya, Validasi & Pindahkan",
    },
    "skip-push-all": {
      title: "Push Semua Data?",
      message: (
        <div>
          <div style={{ marginBottom: 8 }}><strong>{errors.length} data error</strong> akan masuk ke database dengan Kategori = "Lainnya".</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Data tersebut tetap akan tampil di Daftar Barang dan bisa diedit manual nanti.</div>
        </div>
      ),
      danger: false,
      label: "Ya, Push Semua"
    },
    "skip-delete": {
      title: "Hapus Data Error?",
      message: (
        <div>
          <div style={{ marginBottom: 8 }}><strong>{errors.length} data error</strong> akan dihapus secara permanen.</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Hanya <strong>{valids.length} data valid</strong> yang akan di-push ke database.</div>
        </div>
      ),
      danger: true,
      label: "Ya, Hapus & Push Valid"
    },
    "push-valid": {
      title: "Push Data Valid?",
      message: <div><strong>{valids.length} data valid</strong> akan disimpan ke database. Pastikan semua data sudah benar.</div>,
      danger: false,
      label: `Ya, Push ${valids.length} Data`
    },
  };

  const activeConfirm = confirmAction ? confirmMessages[confirmAction] : null;

  return (
    <div style={{ marginTop: 24, paddingBottom: 60 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-clipboard-check" style={{ color: "var(--color-info)" }} />
            Pre-flight Check
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
            Review data sebelum disimpan. Perbaiki error atau skip.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn btn-sm ${tab === "error" ? "btn-solid-danger" : "btn-ghost"}`}
            onClick={() => setTab("error")}
            style={{ gap: 6 }}
          >
            <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} />
            Error ({errors.length})
          </button>
          <button
            className={`btn btn-sm ${tab === "valid" ? "btn-ok" : "btn-ghost"}`}
            onClick={() => setTab("valid")}
            style={{ gap: 6 }}
          >
            <i className="ti ti-circle-check" style={{ fontSize: 15 }} />
            Valid ({valids.length})
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table" style={{ width: "100%", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>Baris</th>
                {tab === "error" && <th style={{ width: "15%" }}>Alasan Error</th>}
                <th style={{ width: tab === "error" ? "20%" : "25%" }}>Kategori *</th>
                <th style={{ width: "20%" }}>Label Aset</th>
                <th style={{ width: "15%" }}>Label</th>
                <th style={{ width: "10%" }}>Tahun</th>
                {tab === "error" && <th style={{ width: "15%" }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {visibleList.length === 0 ? (
                <tr>
                  <td colSpan={tab === "error" ? 8 : 7}>
                    <div className="empty-state">
                      <i className="ti ti-mood-empty" style={{ fontSize: 30 }} />
                      {tab === "error"
                        ? "Tidak ada data error. Semua data valid!"
                        : "Tidak ada data valid di tab ini."}
                    </div>
                  </td>
                </tr>
              ) : visibleList.map((r) => {
                const absoluteIdx = currentList.findIndex(item => item._rowNumber === r._rowNumber);
                
                return (
                  <tr key={`${tab}-${r._rowNumber}`}>
                    <td className="td-sm text-muted" style={{ fontFamily: "monospace" }}>{r._rowNumber}</td>

                    {/* Error reason */}
                    {tab === "error" && (
                      <td>
                        <span style={{
                          fontSize: 12,
                          color: "var(--color-err)",
                          lineHeight: 1.5,
                          display: "block",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}>
                          {r._errorReason}
                        </span>
                      </td>
                    )}

                    {/* Kategori */}
                    <td>
                      {tab === "error" ? (
                        <input
                          type="text"
                          className="input"
                          style={{
                            width: "100%", height: 36, fontSize: 13,
                            borderColor: isValidKategori(r.kategori) ? "rgba(125,212,168,0.4)" : "rgba(240,128,112,0.4)",
                            transition: "border-color 0.2s",
                          }}
                          value={r.kategori || ""}
                          onChange={(e) => handleEdit(absoluteIdx, "kategori", e.target.value)}
                          placeholder="Min 2 karakter alfanumerik"
                        />
                      ) : (
                        <span className="td-name">{r.kategori}</span>
                      )}
                    </td>

                    {/* Label Aset */}
                    <td>
                      {tab === "error" ? (
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", height: 36, fontSize: 13 }}
                          value={r.labelAset || ""}
                          onChange={(e) => handleEdit(absoluteIdx, "labelAset", e.target.value)}
                        />
                      ) : (
                        <span className="td-code">{r.labelAset || r.label || ""}</span>
                      )}
                    </td>

                    {/* Label */}
                    <td>
                      {tab === "error" ? (
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", height: 36, fontSize: 13 }}
                          value={r.label || ""}
                          onChange={(e) => handleEdit(absoluteIdx, "label", e.target.value)}
                        />
                      ) : (
                        <span className="td-code">{r.label || ""}</span>
                      )}
                    </td>

                    {/* Tahun */}
                    <td>
                      {tab === "error" ? (
                        <input
                          type="text"
                          className="input"
                          style={{ width: "100%", height: 36, fontSize: 13 }}
                          value={r.sumberTahun || ""}
                          onChange={(e) => handleEdit(absoluteIdx, "sumberTahun", e.target.value)}
                        />
                      ) : (
                        <span className="td-sm">{r.sumberTahun || ""}</span>
                      )}
                    </td>

                    {/* Actions (error only) */}
                    {tab === "error" && (
                      <td>
                        <div className="action-row">
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleValidateRow(absoluteIdx)}
                            title="Validasi & pindah ke Valid"
                            style={{ color: "var(--color-ok)" }}
                          >
                            <i className="ti ti-check" />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleDeleteRow(absoluteIdx)}
                            title="Hapus baris"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Halaman {currentPage + 1} dari {totalPages} (Total {currentList.length} data)
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <i className="ti ti-chevron-left" /> Sebelumnya
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Selanjutnya <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}

          {totalPages <= 1 && currentList.length > 0 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Menampilkan {currentList.length} data
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 20,
      }}>
        {/* Left: info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <i className="ti ti-info-circle" style={{ fontSize: 15 }} />
          {errors.length > 0
            ? `${errors.length} data error perlu diperbaiki atau di-skip`
            : "Semua data sudah valid"}
        </div>

        {/* Right: buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={pushing}>
            Batal
          </button>

          {/* Skip Error dropdown */}
          {hasErrors && (
            <div style={{ position: "relative" }} ref={skipRef}>
              <button
                className="btn btn-ghost"
                style={{ gap: 6, fontSize: 13 }}
                onClick={() => setShowSkipMenu(prev => !prev)}
                disabled={pushing}
              >
                <i className="ti ti-player-skip-forward" style={{ fontSize: 15 }} />
                Skip Error
                <i className="ti ti-chevron-down" style={{ fontSize: 12, opacity: 0.5, marginLeft: 2 }} />
              </button>

              {showSkipMenu && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  right: 0,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--ds-void)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                  minWidth: 300,
                  zIndex: 100,
                }}>
                  {/* Option 1: Push all */}
                  <button
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      width: "100%", textAlign: "left",
                      padding: "14px 16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => { setShowSkipMenu(false); setConfirmAction("skip-push-all"); }}
                  >
                    <i className="ti ti-upload" style={{ fontSize: 16, color: "var(--color-info)", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Push semua, edit error nanti</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                        Data error masuk DB sebagai "Lainnya". Bisa diedit manual di Daftar Barang.
                      </div>
                    </div>
                  </button>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />

                  {/* Option 2: Delete errors */}
                  <button
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      width: "100%", textAlign: "left",
                      padding: "14px 16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => { setShowSkipMenu(false); setConfirmAction("skip-delete"); }}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 16, color: "var(--color-err)", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Hapus error, push valid saja</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                        {errors.length} data error dibuang. Hanya {valids.length} data valid yang disimpan.
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Validasi Error atau Push Valid Data */}
          {tab === "error" && hasErrors ? (
            <button
              className="btn btn-primary"
              onClick={() => setConfirmAction("bulk-validate")}
              style={{ gap: 8 }}
            >
              <i className="ti ti-checks" /> Validasi & Pindahkan Ke Valid
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={hasErrors || valids.length === 0 || pushing}
              onClick={() => setConfirmAction("push-valid")}
              style={{ gap: 8 }}
            >
              {pushing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <><i className="ti ti-upload" />Push Data Ke DB</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Double-validation Confirm Modal ── */}
      <ConfirmModal
        isOpen={!!confirmAction}
        title={activeConfirm?.title || ""}
        message={activeConfirm?.message || ""}
        danger={activeConfirm?.danger || false}
        confirmLabel={activeConfirm?.label || "Lanjutkan"}
        isLoading={pushing}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
