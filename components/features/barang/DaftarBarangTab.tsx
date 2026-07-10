// components/features/barang/DaftarBarangTab.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";
import LiquidSelect from "@/components/LiquidSelect";
import ConfirmModal from "@/components/ConfirmModal";
import ExportModal from "@/components/features/ExportModal";
import FullTablePreview from "@/components/features/FullTablePreview";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { BARANG_FORM_EMPTY } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";
import type { Barang, Kategori, Ruangan } from "@/types";
import BarangFormFields from "./BarangFormFields";

/* ═══════════════════════════════════════════════════════════
   DaftarBarangTab — Main CRUD table for Barang
   ═══════════════════════════════════════════════════════════ */
export default function DaftarBarangTab({ role }: { role: string }) {
  // Data
  const [barang, setBarang] = useState<Barang[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);

  // Filters & sort
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [sortBy, setSortBy] = useState("tanggalDatang");
  const [sortDir, setSortDir] = useState("desc");

  // Modal state
  const [modal, setModal] = useState<"form" | "qr" | "print_options" | null>(null);
  const [selected, setSelected] = useState<Barang | null>(null);
  const [form, setForm] = useState<BarangFormData>(BARANG_FORM_EMPTY);
  const [qrData, setQrData] = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [bulkQrData, setBulkQrData] = useState<{ qrCode: string; kode: string; nama: string }[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<{ id: string; nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sub-features
  const [showExport, setShowExport] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);

  /* ── Data loading ── */
  const load = useCallback((reset = true) => {
    const currentCursor = reset ? null : cursor;
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (filterKat) p.set("kategoriId", filterKat);
    if (sortBy) p.set("sortBy", sortBy);
    if (sortDir) p.set("sortDir", sortDir);
    if (currentCursor) p.set("cursor", currentCursor);

    if (!reset) setLoadingMore(true);
    api.get<{ data: Barang[]; nextCursor: string | null }>(`/api/barang?${p}`)
      .then(res => {
        if (reset) setBarang(res.data);
        else setBarang(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterKat, cursor, sortBy, sortDir]);

  useEffect(() => { load(true); }, [search, filterKat, sortBy, sortDir]);
  useEffect(() => {
    api.get<Kategori[]>("/api/kategori").then(setKategori);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan);
  }, []);

  /* ── Form helpers ── */
  const handleFieldChange = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setSelected(null);
    setForm(BARANG_FORM_EMPTY);
    setModal("form");
  }

  function openEdit(b: Barang) {
    setSelected(b);
    setForm({
      label: b.label || "", labelAset: b.labelAset || "", nama: b.nama, sn: b.sn || "",
      merek: b.merek || "", model: b.model || "", tipe: b.tipe || "", vendor: b.vendor || "",
      keterangan: b.keterangan || "",
      kondisi: b.kondisi, jumlah: b.jumlah,
      tanggalDatang: b.tanggalDatang ? new Date(b.tanggalDatang).toISOString().split("T")[0] : "",
      tanggalPindah: b.tanggalPindah ? new Date(b.tanggalPindah).toISOString().split("T")[0] : "",
      harga: b.harga?.toString() || "",
      kategoriId: b.kategoriId, ruanganId: b.ruanganId || "",
    });
    setModal("form");
  }

  async function openQR(b: Barang) {
    setSelected(b);
    try {
      const data = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${b.id}/qr`);
      setQrData(data);
      setModal("qr");
    } catch {
      toast.error("Gagal generate QR");
    }
  }

  async function handleBulkPrint(mode: "ALL" | "TODAY" | "NOT_PRINTED" | "SELECTED") {
    let payload: any = { mode };
    
    // For "SELECTED", we use current loaded barang (current page)
    if (mode === "SELECTED") {
      if (barang.length === 0) { toast.error("Tidak ada barang di halaman ini"); return; }
      payload.ids = barang.map(b => b.id);
    }
    
    setModal(null);
    const toastId = toast.loading("Mempersiapkan dokumen cetak...");
    
    try {
      const res = await api.post<{ qrCode: string; kode: string; nama: string }[]>("/api/barang/qr-bulk", payload);
      setBulkQrData(res);
      toast.success("Siap dicetak!", { id: toastId });
      setTimeout(() => window.print(), 500);
      
      // Refresh list if NOT_PRINTED was selected since we might have updated hasSticker
      if (mode === "NOT_PRINTED") load(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal menyiapkan dokumen cetak", { id: toastId });
    }
  }

  async function handleSave() {
    if (!form.label || !form.nama || !form.kategoriId) {
      toast.error("Label, nama, dan kategori wajib diisi");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      jumlah: Number(form.jumlah),
      tanggalDatang: form.tanggalDatang ? new Date(form.tanggalDatang).toISOString() : null,
      tanggalPindah: form.tanggalPindah ? new Date(form.tanggalPindah).toISOString() : null,
      harga: form.harga ? Number(form.harga) : null,
      ruanganId: form.ruanganId || null,
    };
    try {
      if (selected) {
        await api.put(`/api/barang/${selected.id}`, body);
        toast.success("Barang diperbarui");
      } else {
        await api.post("/api/barang", body);
        toast.success("Barang ditambahkan");
      }
      setModal(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/barang/${confirmDel.id}`);
      toast.success("Barang dihapus");
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus");
    } finally {
      setIsDeleting(false);
      setConfirmDel(null);
    }
  }

  /* ── QR download helper ── */
  function downloadQR() {
    if (!qrData) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 25, 25, 250, 250);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(qrData.kode, 150, 315);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${qrData.kode}-qr.png`;
      a.click();
    };
    img.src = qrData.qrCode;
  }

  return (
    <>
      {/* Filters */}
      <div className="glass filter-bar mb-16">
        <div className="search-wrap" style={{ flex: "1 1 180px", minWidth: 150 }}>
          <i className="ti ti-search search-icon" />
          <input className="input" placeholder="Cari nama barang…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: "0 1 180px", minWidth: 150 }}>
          <LiquidSelect
            value={filterKat}
            onChange={setFilterKat}
            options={[
              { value: "", label: "Semua Kategori" },
              ...kategori.map(k => ({ value: k.id, label: k.nama })),
            ]}
          />
        </div>
        <div style={{ flex: "0 1 180px", minWidth: 150 }}>
          <LiquidSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "tanggalDatang", label: "Sort: Tanggal" },
              { value: "merek", label: "Sort: Merek" },
              { value: "kategoriId", label: "Sort: Jenis" },
              { value: "ruanganId", label: "Sort: Ruangan" },
            ]}
          />
        </div>
        <div style={{ flex: "0 1 120px", minWidth: 100 }}>
          <LiquidSelect
            value={sortDir}
            onChange={setSortDir}
            options={[
              { value: "desc", label: "Terbaru/Z-A" },
              { value: "asc", label: "Terlama/A-Z" },
            ]}
          />
        </div>
        <button className="btn btn-ghost" onClick={() => setFullPreview(true)}>
          <i className="ti ti-table" /> Full Preview
        </button>
        {role === "ADMIN" && (
          <>
            <button className="btn btn-primary" onClick={openAdd}>
              <i className="ti ti-plus" /> Tambah
            </button>
            <button className="btn btn-ghost" onClick={() => setModal("print_options")} title="Print QR Semua Barang (Bulk)">
              <i className="ti ti-printer" /> Bulk Print
            </button>
            <button className="btn btn-primary" onClick={() => setShowExport(true)}>
              <i className="ti ti-download" /> Export
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ width: "6%" }}>No</th>
                <th>Kategori</th>
                <th style={{ width: "20%" }}>Label</th>
                <th style={{ width: "20%" }}>Label Aset</th>
                <th style={{ width: "15%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <i className="ti ti-box-off" style={{ fontSize: 30 }} />
                      Tidak ada data barang
                    </div>
                  </td>
                </tr>
              ) : barang.map((b, i) => (
                <tr key={b.id}>
                  <td className="td-sm text-muted">{i + 1}</td>
                  <td className="td-sm font-medium">{b.kategori.nama}</td>
                  <td className="td-code">{b.label || "-"}</td>
                  <td className="td-code">{b.labelAset || "-"}</td>
                  <td>
                    <div className="action-row">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openQR(b)} title="QR Code">
                        <i className="ti ti-qrcode" />
                      </button>
                      {role === "ADMIN" && (
                        <>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Edit">
                            <i className="ti ti-edit" />
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => setConfirmDel({ id: b.id, nama: b.nama })} title="Hapus">
                            <i className="ti ti-trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cursor && (
            <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button className="btn btn-ghost" onClick={() => load(false)} disabled={loadingMore}>
                {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Barang"
        message={`Yakin ingin menghapus ${confirmDel?.nama}?`}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
        isLoading={isDeleting}
        danger
      />

      <FullTablePreview isOpen={fullPreview} onClose={() => setFullPreview(false)} />

      {/* Edit/Add Modal */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Barang" : "Tambah Barang"}>
        <BarangFormFields
          form={form}
          onChange={handleFieldChange}
          kategori={kategori}
          ruangan={ruangan}
        />
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={modal === "qr"} onClose={() => setModal(null)} title="QR Code Barang">
        {qrData && (
          <div style={{ textAlign: "center" }}>
            <div id="print-qr-area" style={{ background: "#fff", padding: "24px", borderRadius: "12px", display: "inline-block", margin: "0 auto 20px" }}>
              <img src={qrData.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block", marginBottom: 16 }} />
              <div style={{ fontSize: 18, color: "#000", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "2px" }}>
                {qrData.kode}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }} className="no-print">
              <button onClick={downloadQR} className="btn btn-primary btn-sm">
                <i className="ti ti-download" /> Download PNG
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                <i className="ti ti-printer" /> Print
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Options Modal */}
      <Modal open={modal === "print_options"} onClose={() => setModal(null)} title="Pilih Opsi Cetak QR">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "12px" }}>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("NOT_PRINTED")}>
            <i className="ti ti-check" style={{ color: "var(--color-ok)" }} /> Print Belum Pernah Dicetak
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("TODAY")}>
            <i className="ti ti-calendar" style={{ color: "var(--color-info)" }} /> Print Data Hari Ini
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("SELECTED")}>
            <i className="ti ti-file" style={{ color: "var(--ds-mist)" }} /> Print Halaman Ini Saja
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("ALL")}>
            <i className="ti ti-database" style={{ color: "var(--color-warn)" }} /> Print Seluruh Database
          </button>
        </div>
      </Modal>

      {/* Hidden Bulk Print Area */}
      {bulkQrData && bulkQrData.length > 0 && (
        <div id="bulk-print-area">
          {bulkQrData.map((qr, idx) => (
            <div key={qr.kode || `qr-${idx}`} className="bulk-qr-item">
              <img src={qr.qrCode} alt="QR" />
              <div>{qr.kode}</div>
            </div>
          ))}
        </div>
      )}

      {showExport && (
        <ExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          kategoriList={kategori}
        />
      )}
    </>
  );
}
