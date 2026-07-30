// components/features/LaporanManager.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort, terbilang } from "@/helpers/format";
import ConfirmModal from "@/components/ConfirmModal";
import UnifiedExportModal from "@/components/features/UnifiedExportModal";
import { PROGDI_OPTIONS } from "@/constants/barang";
import type { Pengeluaran } from "@/types";

type JenisFilter = "" | "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";

const EMPTY = {
  judul: "",
  namaBarang: "",
  progdi: "",
  keterangan: "",
  nominal: "",
  tanggal: "",
  jenis: "PEMBELIAN_ASET",
  jenisBukti: "",   // SPB | KWITANSI | NOTA
  nomorBukti: "",   // bebas karakter: 03/290-12, dll
  pembelianKe: "",
};
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

/** Generate kode preview from jenisBukti, nomorBukti, tanggal, pembelianKe */
function generateKodePreview(tanggal: string, pembelianKe: string, jenisBukti: string, nomorBukti: string): string {
  if (!tanggal || !pembelianKe || isNaN(parseInt(pembelianKe, 10))) return "";
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const nnn = String(parseInt(pembelianKe, 10)).padStart(3, "0");
  const basePart = `${mm}${yyyy}-${nnn}`;
  if (jenisBukti && nomorBukti) return `${jenisBukti}-${nomorBukti}-${basePart}`;
  if (jenisBukti) return `${jenisBukti}-${basePart}`;
  return basePart;
}

export default function LaporanManager({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  const [list,    setList]    = useState<Pengeluaran[]>([]);
  const [filter,  setFilter]  = useState<JenisFilter>("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [notas,   setNotas]   = useState<File[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [confirmDel, setConfirmDel] = useState<{ id: string, judul: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // View invoice modal state
  const [viewInvoice, setViewInvoice] = useState<Pengeluaran | null>(null);

  // Export & Print State
  const [exportModal, setExportModal] = useState(false);
  const [printData, setPrintData] = useState<Pengeluaran[] | null>(null);

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
  const kodePreview = generateKodePreview(form.tanggal, form.pembelianKe, form.jenisBukti, form.nomorBukti);

  async function handleSave() {
    if (!form.judul.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.nominal || parseFloat(form.nominal) <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!form.tanggal) { toast.error("Tanggal wajib diisi"); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("judul", form.judul);
      if (form.namaBarang) fd.append("namaBarang", form.namaBarang);
      if (form.progdi) fd.append("progdi", form.progdi);
      fd.append("keterangan", form.keterangan);
      fd.append("nominal", form.nominal);
      fd.append("tanggal", form.tanggal);
      fd.append("jenis", form.jenis);
      if (form.jenisBukti) fd.append("jenisBukti", form.jenisBukti);
      if (form.nomorBukti) fd.append("nomorBukti", form.nomorBukti);
      if (form.pembelianKe) fd.append("pembelianKe", form.pembelianKe);
      notas.forEach(n => fd.append("nota", n));

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
      setNotas([]);
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
      namaBarang: p.namaBarang ?? "",
      progdi: p.progdi ?? "",
      keterangan: p.keterangan ?? "",
      nominal: p.nominal.toString(),
      tanggal: new Date(p.tanggal).toISOString().split("T")[0],
      jenis: p.jenis,
      jenisBukti: p.jenisBukti ?? "",
      nomorBukti: p.nomorBukti ?? "",
      pembelianKe: p.pembelianKe ? String(p.pembelianKe) : "",
    });
    setNotas([]);
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

  async function handleExport(format: string, mode: "ALL" | "TODAY" | "SELECTED") {
    const toastId = toast.loading("Mengekspor data...");
    setExportModal(false);

    if (format === "pdf") {
      try {
        const query = mode === "TODAY" ? "?jenis=TODAY&limit=10000" : "?limit=10000";
        // We will hijack the existing endpoint to return all by high limit
        const res = await api.get<{ data: Pengeluaran[] }>(`/api/pengeluaran${query}`);
        setPrintData(res.data);
        toast.success("Siap dicetak!", { id: toastId });
        setTimeout(() => window.print(), 500);
      } catch (e: any) {
        toast.error("Gagal menyiapkan data cetak", { id: toastId });
      }
      return;
    }

    try {
      const q = new URLSearchParams();
      q.set("format", format);
      q.set("mode", mode);
      
      const res = await fetch(`/api/pengeluaran/export?${q.toString()}`);
      if (!res.ok) throw new Error("Gagal export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      a.download = `Export_Cashflow_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Berhasil di-export", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Gagal export", { id: toastId });
    }
  }

  const totalNominal = list.reduce((sum, p) => sum + p.nominal, 0);

  return (
    <div className="animate-fade-in">
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

      <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>
        {/* Top Header / Primary Actions */}
        <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ flex: "1 1 200px", minWidth: 150, margin: 0 }}>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <button className="btn btn-ghost" style={{ border: "1px solid rgba(255,255,255,0.1)" }} onClick={() => setExportModal(true)}>
              <i className="ti ti-file-export" /> Export Data
            </button>
            {role === "ADMIN" && (
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setNotas([]); setSelectedId(null); setModal(true); }}>
                <i className="ti ti-plus" /> Input Pengeluaran
              </button>
            )}
          </div>
        </div>

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
                  <td className="td-sm">{p.user.name ?? ""}</td>
                  <td>
                    {p.kodePembelian ? (
                      <span className="badge badge-muted" style={{ fontSize: 10, padding: "2px 6px", fontFamily: "var(--font-mono, monospace)" }}>
                        {p.kodePembelian}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}></span>
                    )}
                  </td>
                  {role === "ADMIN" && (
                    <td>
                      <div className="action-row">
                        {p.notaUrls && p.notaUrls.length > 0 && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => setViewInvoice(p)}
                            title={`Lihat ${p.notaUrls.length} Nota/Invoice`}
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
        {/* Row 1: Judul + Jenis Pengeluaran */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Judul *</label>
            <input className="input" placeholder="Pembelian Keyboard" value={form.judul} onChange={e => setF("judul", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Jenis Pengeluaran *</label>
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

        {/* Row 1b: Nama Barang + Progdi (baru) */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Nama Barang <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
            <input className="input" placeholder="Laptop Asus ROG" value={form.namaBarang} onChange={e => setF("namaBarang", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Progdi <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
            <LiquidSelect
              value={form.progdi}
              onChange={val => setF("progdi", val)}
              options={[{ value: "", label: "— Pilih Progdi —" }, ...PROGDI_OPTIONS]}
            />
          </div>
        </div>

        {/* Row 2: Nominal + Tanggal */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Nominal (Rp) *</label>
            <input type="number" className="input" placeholder="0" value={form.nominal} onChange={e => setF("nominal", e.target.value)} />
            {form.nominal && !isNaN(Number(form.nominal)) && Number(form.nominal) > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                {terbilang(Number(form.nominal))} Rupiah
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Tanggal *</label>
            <input type="date" max="9999-12-31" className="input" value={form.tanggal} onChange={e => setF("tanggal", e.target.value)} />
          </div>
        </div>

        {/* Row 3: Jenis Bukti + Nomor Bukti */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Jenis Bukti Pembayaran <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
            <LiquidSelect
              value={form.jenisBukti}
              onChange={val => setF("jenisBukti", val)}
              options={[
                { value: "", label: "— Pilih Jenis Bukti —" },
                { value: "SPB", label: "SPB" },
                { value: "KWITANSI", label: "Kwitansi" },
                { value: "NOTA", label: "Nota" },
              ]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nomor Bukti <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional, misal: 03/290-12)</span></label>
            <input
              className="input"
              placeholder="03/290-12"
              value={form.nomorBukti}
              onChange={e => setF("nomorBukti", e.target.value)}
            />
          </div>
        </div>

        {/* Row 4: Pembelian ke + Preview Kode */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Pembelian ke-? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(opsional)</span></label>
            <input type="number" className="input" placeholder="1" min={1} value={form.pembelianKe} onChange={e => setF("pembelianKe", e.target.value)} />
          </div>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {kodePreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Preview Kode:</span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 13, color: "var(--color-info)", letterSpacing: "0.5px", wordBreak: "break-all" }}>{kodePreview}</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setF("keterangan", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Upload Nota / Invoice <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(jpg, pdf, docx, opsional)</span></label>
          <input type="file" multiple className="input" accept="image/*,.pdf,.doc,.docx" onChange={e => setNotas(Array.from(e.target.files ?? []))} />
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
        {viewInvoice && viewInvoice.notaUrls && viewInvoice.notaUrls.length > 0 && (
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

                        {/* File viewer — horizontal scroll kalau > 1 nota */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: 16,
                display: "flex",
                flexDirection: "row",
                gap: 16,
                overflowX: "auto",
                paddingBottom: 8,
              }}
            >
              {viewInvoice.notaUrls.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: "0 0 320px",
                    position: "relative",
                    padding: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Nota #{idx + 1}</span>
                    {role === "ADMIN" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!confirm("Hapus nota ini?")) return;
                          try {
                            await api.delete(`/api/pengeluaran/${viewInvoice.id}/nota`, { url });
                            toast.success("Nota dihapus");
                            load();
                            setViewInvoice(prev => prev ? { ...prev, notaUrls: prev.notaUrls.filter(u => u !== url) } : null);
                          } catch {
                            toast.error("Gagal menghapus nota");
                          }
                        }}
                      >
                        <i className="ti ti-trash" /> Hapus
                      </button>
                    )}
                  </div>
                  {getFileType(url) === "image" ? (
                    <img
                      src={url}
                      alt={`Nota ${idx + 1}`}
                      style={{ width: "100%", maxHeight: 400, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}
                    />
                  ) : getFileType(url) === "pdf" ? (
                    <iframe
                      src={url}
                      title={`Nota PDF ${idx + 1}`}
                      style={{ width: "100%", height: 400, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", padding: 32 }}>
                      <i className="ti ti-file-text" style={{ fontSize: 48, color: "var(--text-muted)", display: "block", marginBottom: 12 }} />
                      <a href={url} download className="btn btn-primary" target="_blank" rel="noopener">
                        <i className="ti ti-download" /> Download File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Nota Inline */}
            {role === "ADMIN" && (
              <div style={{ marginTop: 8, padding: 16, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.01)" }}>
                <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Tambah Nota Baru</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="file" 
                    className="input" 
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ flex: 1 }}
                    id={`add-nota-${viewInvoice.id}`}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      const input = document.getElementById(`add-nota-${viewInvoice.id}`) as HTMLInputElement;
                      const file = input.files?.[0];
                      if (!file) return toast.error("Pilih file terlebih dahulu");
                      const fd = new FormData();
                      fd.append("nota", file);
                      try {
                        const res = await fetch(`/api/pengeluaran/${viewInvoice.id}/nota`, { method: "POST", body: fd });
                        if (!res.ok) throw new Error("Gagal mengunggah nota");
                        toast.success("Nota ditambahkan");
                        input.value = "";
                        load();
                        const updated = await res.json();
                        setViewInvoice(updated);
                      } catch (e: any) {
                        toast.error(e.message || "Gagal mengunggah nota");
                      }
                    }}
                  >
                    <i className="ti ti-upload" /> Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {viewInvoice && (!viewInvoice.notaUrls || viewInvoice.notaUrls.length === 0) && (
          <div className="empty-state" style={{ padding: 32 }}>
            <i className="ti ti-file-off" style={{ fontSize: 36 }} />
            <p style={{ marginBottom: 16 }}>Tidak ada file nota untuk invoice ini.</p>
            {role === "ADMIN" && (
              <div style={{ marginTop: 8, padding: 16, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 8, background: "rgba(255,255,255,0.01)", textAlign: "left" }}>
                <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Tambah Nota Pertama</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="file" 
                    className="input" 
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ flex: 1 }}
                    id={`add-first-nota-${viewInvoice.id}`}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      const input = document.getElementById(`add-first-nota-${viewInvoice.id}`) as HTMLInputElement;
                      const file = input.files?.[0];
                      if (!file) return toast.error("Pilih file terlebih dahulu");
                      const fd = new FormData();
                      fd.append("nota", file);
                      try {
                        const res = await fetch(`/api/pengeluaran/${viewInvoice.id}/nota`, { method: "POST", body: fd });
                        if (!res.ok) throw new Error("Gagal mengunggah nota");
                        toast.success("Nota ditambahkan");
                        input.value = "";
                        load();
                        const updated = await res.json();
                        setViewInvoice(updated);
                      } catch (e: any) {
                        toast.error(e.message || "Gagal mengunggah nota");
                      }
                    }}
                  >
                    <i className="ti ti-upload" /> Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <UnifiedExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        type="CASHFLOW"
        onExport={handleExport}
      />

      {/* Hidden Print Area */}
      {printData && (
        <div id="print-cashflow-area" style={{ display: "none" }} className="print-only">
          <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #000", paddingBottom: 16 }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 24 }}>Laporan Keuangan & Cashflow</h2>
            <p style={{ margin: 0, fontSize: 14 }}>Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>NO</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>KODE</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>TANGGAL</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>JUDUL</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>JENIS</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "right" }}>NOMINAL</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {printData.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{i + 1}</td>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{p.kodePembelian || p.id.slice(-6).toUpperCase()}</td>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{fDateShort(p.tanggal)}</td>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{p.judul}</td>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{jenisLabel[p.jenis] ?? p.jenis}</td>
                  <td style={{ border: "1px solid #000", padding: 8, textAlign: "right" }}>Rp {p.nominal.toLocaleString("id-ID")}</td>
                  <td style={{ border: "1px solid #000", padding: 8 }}>{p.keterangan || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
