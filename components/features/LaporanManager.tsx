// components/features/LaporanManager.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import ConfirmModal from "@/components/ConfirmModal";
import type { Pengeluaran } from "@/types";

type JenisFilter = "" | "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";

const EMPTY = { judul: "", keterangan: "", nominal: "", tanggal: "", jenis: "PEMBELIAN_ASET", pembelianKe: "" };
const jenisLabel: Record<string, string> = {
  PEMBELIAN_ASET: "Pembelian Aset",
  MAINTENANCE: "Maintenance",
  LAINNYA: "Lainnya",
};
const jenisBadge: Record<string, string> = {
  PEMBELIAN_ASET: "badge-info",
  MAINTENANCE: "badge-warn",
  LAINNYA: "badge-muted",
};

/** Determine how to display a file by its extension */
function getFileType(url: string): "image" | "pdf" | "other" {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}

/** Generate kode pembelian preview from tanggal + pembelianKe */
function generateKodePreview(tanggal: string, pembelianKe: string): string {
  if (!tanggal || !pembelianKe || isNaN(parseInt(pembelianKe, 10))) return "";
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const nnn = String(parseInt(pembelianKe, 10)).padStart(3, "0");
  return `${mm}${yyyy}-${nnn}`;
}

export default function LaporanManager({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  const [list,    setList]    = useState<Pengeluaran[]>([]);
  const [filter,  setFilter]  = useState<JenisFilter>("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [nota,    setNota]    = useState<File | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [confirmDel, setConfirmDel] = useState<{ id: string, judul: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // View invoice modal state
  const [viewInvoice, setViewInvoice] = useState<Pengeluaran | null>(null);

  const load = (reset = true) => {
    const currentCursor = reset ? null : cursor;
    let params = filter ? `jenis=${filter}` : "";
    if (currentCursor) params += `${params ? "&" : ""}cursor=${currentCursor}`;
    const query = params ? `?${params}` : "";

    if (!reset) setLoadingMore(true);
    api.get<{ data: Pengeluaran[]; nextCursor: string | null }>(`/api/pengeluaran${query}`)
      .then(res => {
        if (reset) setList(res.data);
        else setList(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
  };

  useEffect(() => { load(true); }, [filter]);

  useEffect(() => {
    if (searchParams.get("action") === "add" && role === "ADMIN") {
      setModal(true);
    }
  }, [searchParams, role]);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Live kode preview
  const kodePreview = generateKodePreview(form.tanggal, form.pembelianKe);

  async function handleSave() {
    if (!form.judul.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.nominal || parseFloat(form.nominal) <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!form.tanggal) { toast.error("Tanggal wajib diisi"); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("judul", form.judul);
      fd.append("keterangan", form.keterangan);
      fd.append("nominal", form.nominal);
      fd.append("tanggal", form.tanggal);
      fd.append("jenis", form.jenis);
      if (form.pembelianKe) fd.append("pembelianKe", form.pembelianKe);
      if (nota) fd.append("nota", nota);

      const method = selectedId ? "PUT" : "POST";
      const url = selectedId ? `/api/pengeluaran/${selectedId}` : "/api/pengeluaran";
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast.success(selectedId ? "Pengeluaran diperbarui" : "Pengeluaran berhasil dicatat");
      setModal(false);
      setForm(EMPTY);
      setNota(null);
      setSelectedId(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  function openEdit(p: Pengeluaran) {
    setSelectedId(p.id);
    setForm({
      judul: p.judul,
      keterangan: p.keterangan ?? "",
      nominal: p.nominal.toString(),
      tanggal: new Date(p.tanggal).toISOString().split("T")[0],
      jenis: p.jenis,
      pembelianKe: p.pembelianKe ? String(p.pembelianKe) : "",
    });
    setNota(null);
    setModal(true);
  }

  function handleDelete(id: string, judul: string) {
    setConfirmDel({ id, judul });
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/pengeluaran/${confirmDel.id}`);
      toast.success("Pengeluaran dihapus");
      load();
    } catch { toast.error("Gagal menghapus"); }
    finally { setIsDeleting(false); setConfirmDel(null); }
  }

  function exportCSV() {
    const headers = ["Judul", "Jenis", "Nominal (Rp)", "Tanggal", "Kode Pembelian", "Deskripsi", "Pencatat"];
    const rows = list.map(p => [
      p.judul,
      jenisLabel[p.jenis] ?? p.jenis,
      p.nominal.toString(),
      fDateShort(p.tanggal),
      p.kodePembelian ?? "",
      p.keterangan ?? "",
      p.user.name ?? p.user.email,
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `laporan-pengeluaran-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  }

  const totalNominal = list.reduce((sum, p) => sum + p.nominal, 0);

  return (
    <div className="animate-fade-in">
      {/* Filters & Export */}
      <div className="glass filter-bar mb-16">
        <div style={{ flex: "0 1 180px", minWidth: 150 }}>
          <LiquidSelect
            value={filter}
            onChange={val => setFilter(val as JenisFilter)}
            options={[
              { value: "", label: "Semua Jenis" },
              { value: "PEMBELIAN_ASET", label: "Pembelian Aset" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "LAINNYA", label: "Lainnya" }
            ]}
          />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
        {role === "ADMIN" && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setNota(null); setSelectedId(null); setModal(true); }}>
            <i className="ti ti-plus" /> Input Pengeluaran
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid-3 mb-16">
        {[
          { label: "Total Pengeluaran", value: list.length,                                                   badge: "badge-info" },
          { label: "Total Nominal",     value: `Rp ${totalNominal.toLocaleString("id-ID")}`,                  badge: "badge-warn" },
          { label: "Pembelian Aset",    value: list.filter(p => p.jenis === "PEMBELIAN_ASET").length,          badge: "badge-ok" },
        ].map(s => (
          <div key={s.label} className="glass summary-badge-row">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Judul</th>
                <th style={{ width: "14%" }}>Jenis</th>
                <th style={{ width: "16%" }}>Nominal</th>
                <th style={{ width: "12%" }}>Tanggal</th>
                <th style={{ width: "14%" }}>Pencatat</th>
                <th style={{ width: "8%" }}>Nota</th>
                {role === "ADMIN" && <th style={{ width: "14%" }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="ti ti-file-off" style={{ fontSize: 28 }} />
                      Belum ada data pengeluaran
                    </div>
                  </td>
                </tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="td-name">{p.judul}</div>
                    {p.keterangan && <div className="td-code">{p.keterangan}</div>}
                  </td>
                  <td><span className={`badge ${jenisBadge[p.jenis]}`}>{jenisLabel[p.jenis]}</span></td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                    Rp {p.nominal.toLocaleString("id-ID")}
                  </td>
                  <td className="td-sm">{fDateShort(p.tanggal)}</td>
                  <td className="td-sm">{p.user.name ?? "—"}</td>
                  <td>
                    {p.kodePembelian ? (
                      <span className="badge badge-muted" style={{ fontSize: 10, padding: "2px 6px", fontFamily: "var(--font-mono, monospace)" }}>
                        {p.kodePembelian}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  {role === "ADMIN" && (
                    <td>
                      <div className="action-row">
                        {p.notaUrl && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => setViewInvoice(p)}
                            title="Lihat Nota/Invoice"
                          >
                            <i className="ti ti-eye" />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit">
                          <i className="ti ti-edit" />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id, p.judul)} title="Hapus">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {cursor && (
            <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => load(false)} 
                disabled={loadingMore}
              >
                {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Laporan"
        message={`Apakah Anda yakin ingin menghapus laporan "${confirmDel?.judul}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      {/* Modal Input/Edit Pengeluaran */}
      <Modal open={modal} onClose={() => setModal(false)} title={selectedId ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Judul *</label>
            <input className="input" placeholder="Pembelian Keyboard" value={form.judul} onChange={e => setF("judul", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jenis *</label>
            <LiquidSelect
              value={form.jenis}
              onChange={val => setF("jenis", val)}
              options={[
                { value: "PEMBELIAN_ASET", label: "Pembelian Aset" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "LAINNYA", label: "Lainnya" }
              ]}
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nominal (Rp) *</label>
            <input type="number" className="input" placeholder="0" value={form.nominal} onChange={e => setF("nominal", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tanggal *</label>
            <input type="date" className="input" value={form.tanggal} onChange={e => setF("tanggal", e.target.value)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Pembelian ke-? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
            <input type="number" className="input" placeholder="1" min={1} value={form.pembelianKe} onChange={e => setF("pembelianKe", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {kodePreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Kode:</span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 14, color: "var(--color-info)", letterSpacing: "0.5px" }}>{kodePreview}</span>
              </div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setF("keterangan", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Upload Nota / Invoice <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(jpg, pdf, docx — opsional)</span></label>
          <input type="file" className="input" accept="image/*,.pdf,.doc,.docx" onChange={e => setNota(e.target.files?.[0] ?? null)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <>
              <i className="ti ti-check" />Simpan</>}
          </button>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={viewInvoice ? `Invoice: ${viewInvoice.judul}` : "Invoice"}>
        {viewInvoice && viewInvoice.notaUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Invoice metadata */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Judul</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{viewInvoice.judul}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Nominal</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Rp {viewInvoice.nominal.toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Tanggal</span>
                <span style={{ color: "var(--text-primary)" }}>{fDateShort(viewInvoice.tanggal)}</span>
              </div>
              {viewInvoice.kodePembelian && (
                <div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Kode Pembelian</span>
                  <span className="badge badge-info" style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>{viewInvoice.kodePembelian}</span>
                </div>
              )}
            </div>

            {/* File viewer */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              {getFileType(viewInvoice.notaUrl) === "image" ? (
                <img
                  src={viewInvoice.notaUrl}
                  alt="Nota"
                  style={{ width: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}
                />
              ) : getFileType(viewInvoice.notaUrl) === "pdf" ? (
                <iframe
                  src={viewInvoice.notaUrl}
                  title="Nota PDF"
                  style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <i className="ti ti-file-text" style={{ fontSize: 48, color: "var(--text-muted)", display: "block", marginBottom: 12 }} />
                  <a href={viewInvoice.notaUrl} download className="btn btn-primary" target="_blank" rel="noopener">
                    <i className="ti ti-download" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        {viewInvoice && !viewInvoice.notaUrl && (
          <div className="empty-state" style={{ padding: 32 }}>
            <i className="ti ti-file-off" style={{ fontSize: 36 }} />
            <p>Tidak ada file nota untuk invoice ini.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
