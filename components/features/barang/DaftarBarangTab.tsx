// components/features/barang/DaftarBarangTab.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";
import UnifiedExportModal from "@/components/features/UnifiedExportModal";
import LiquidSelect from "@/components/LiquidSelect";
import LiquidSelectAsync from "@/components/LiquidSelectAsync";
import ConfirmModal from "@/components/ConfirmModal";

import FullTablePreview from "@/components/features/FullTablePreview";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { useQrScanner } from "@/hooks/useQrScanner";
import { parseQrPayload } from "@/helpers/format";
import { BARANG_FORM_EMPTY } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";
import type { Barang, Kategori, Ruangan, Pengeluaran } from "@/types";
import BarangFormFields from "./BarangFormFields";
import { fDateShort } from "@/helpers/format";

/* ═══════════════════════════════════════════════════════════
   DaftarBarangTab (Main CRUD table for Barang)
   ═══════════════════════════════════════════════════════════ */
export default function DaftarBarangTab({ role }: { role: string }) {
  // Data
  const [barang, setBarang] = useState<Barang[]>([]);

  // Filters & sort
  const [search, setSearch] = useState("");

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const handleScanResult = async (raw: string) => {
    const code = parseQrPayload(raw);
    setSearch(code);
    setScanModalOpen(false);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(code)}`);
      if (data && data.id) {
        openCekBarang(data);
      }
    } catch {

    }
  };
  const { videoRef, canvasRef, scanning, startCamera, stopCamera } = useQrScanner(handleScanResult);
  const [filterKat, setFilterKat] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  // Modal state
  const [modal, setModal] = useState<"form" | "qr" | "print_options" | "print_select" | "export_options" | "export_select" | "cek" | null>(null);
  const [selected, setSelected] = useState<Barang | null>(null);
  const [form, setForm] = useState<BarangFormData>(BARANG_FORM_EMPTY);
  const [qrData, setQrData] = useState<{ qrCode: string; kode: string } | null>(null);
  const [bulkQrData, setBulkQrData] = useState<{ qrCode: string; kode: string }[] | null>(null);

  // Print Selection state
  const [printSearch, setPrintSearch] = useState("");
  const [printSearchResults, setPrintSearchResults] = useState<Barang[]>([]);
  const [selectedPrintIds, setSelectedPrintIds] = useState<Set<string>>(new Set());
  const [isSearchingPrint, setIsSearchingPrint] = useState(false);

  // Note: we can remove exportFormat state since it's inside the modal, but handleBulkExport expects it to be passed.

  // Export Selection state
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exportSearch, setExportSearch] = useState("");
  const [exportSearchResults, setExportSearchResults] = useState<Barang[]>([]);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [isSearchingExport, setIsSearchingExport] = useState(false);

  // Print Unprinted Confirm State
  const [confirmUnprintedCount, setConfirmUnprintedCount] = useState<number | null>(null);
  const [isCheckingUnprinted, setIsCheckingUnprinted] = useState(false);

  // Cek Barang state
  const [cekBarang, setCekBarang] = useState<Barang | null>(null);
  const [cekInvoice, setCekInvoice] = useState<Pengeluaran | null>(null);
  const [cekLoading, setCekLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<{ id: string; nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sub-features
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
    api.get<{ data: Barang[]; nextCursor: string | null; totalCount: number }>(`/api/barang?${p}`)
      .then(res => {
        if (reset) setBarang(res.data);
        else setBarang(prev => [...prev, ...res.data]);
        setCursor(res.nextCursor);
        setTotalCount(res.totalCount ?? 0);
      })
      .catch(console.error)
      .finally(() => { if (!reset) setLoadingMore(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterKat, cursor, sortBy, sortDir]);

  useEffect(() => { load(true); }, [search, filterKat, sortBy, sortDir]);

  /* ── Print Selection Search ── */
  useEffect(() => {
    if (modal === "print_select") {
      setIsSearchingPrint(true);
      const delay = setTimeout(() => {
        api.get<{ data: Barang[] }>(`/api/barang?limit=50&search=${encodeURIComponent(printSearch)}`)
          .then(res => setPrintSearchResults(res.data))
          .catch(console.error)
          .finally(() => setIsSearchingPrint(false));
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [modal, printSearch]);

  /* ── Export Selection Search ── */
  useEffect(() => {
    if (modal === "export_select") {
      setIsSearchingExport(true);
      const delay = setTimeout(() => {
        api.get<{ data: Barang[] }>(`/api/barang?limit=50&search=${encodeURIComponent(exportSearch)}`)
          .then(res => setExportSearchResults(res.data))
          .catch(console.error)
          .finally(() => setIsSearchingExport(false));
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [modal, exportSearch]);

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
      namaBarang: b.namaBarang || "",
      progdi: b.progdi || "",
      label: b.label || "", labelAset: b.labelAset || "", sn: b.sn || "",
      merek: b.merek || "", model: b.model || "", tipe: b.tipe || "", vendor: b.vendor || "",
      keterangan: b.keterangan || "",
      kondisi: b.kondisi, jumlah: b.jumlah,
      tanggalDatang: b.tanggalDatang ? new Date(b.tanggalDatang).toISOString().split("T")[0] : "",
      tanggalPindah: b.tanggalPindah ? new Date(b.tanggalPindah).toISOString().split("T")[0] : "",
      harga: b.harga?.toString() || "",
      sumberTahun: b.sumberTahun || "",
      status: b.status || "TERSEDIA",
      pembelianKe: b.pembelianKe?.toString() || "",
      kategori: b.kategori?.nama || b.kategoriId || "",
      ruangan: b.ruangan?.kode || b.ruanganId || "",
      pengeluaranId: b.pengeluaranId || "",
      pengeluaranDisplayCode: "",
    });
    setModal("form");
  }

  async function openQR(b: Barang) {
    setSelected(b);
    try {
      const data = await api.get<{ qrCode: string; kode: string }>(`/api/barang/${b.id}/qr`);
      setQrData(data);
      setModal("qr");
    } catch {
      toast.error("Gagal generate QR");
    }
  }

  async function handleBulkPrint(mode: "ALL" | "TODAY" | "NOT_PRINTED" | "SELECTED", customIds?: string[]) {
    let payload: any = { mode };

    // For "SELECTED", we use customIds if provided, else use current loaded barang (current page)
    if (mode === "SELECTED") {
      if (customIds) {
        payload.ids = customIds;
      } else {
        if (barang.length === 0) { toast.error("Tidak ada barang di halaman ini"); return; }
        payload.ids = barang.map(b => b.id);
      }
    }

    setModal(null);
    setConfirmUnprintedCount(null);
    const toastId = toast.loading("Mempersiapkan dokumen cetak...");

    try {
      const res = await api.post<{ qrCode: string; kode: string }[]>("/api/barang/qr-bulk", payload);
      setBulkQrData(res);
      toast.success("Siap dicetak!", { id: toastId });
      setTimeout(() => window.print(), 500);

      // Refresh list if NOT_PRINTED was selected since we might have updated hasSticker
      if (mode === "NOT_PRINTED") load(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal menyiapkan dokumen cetak", { id: toastId });
    }
  }

  async function handleBulkExport(mode: "ALL" | "TODAY" | "SELECTED", customIds?: string[], format: string = "xlsx") {
    const toastId = toast.loading("Mengekspor data...");
    setModal(null);
    try {
      const q = new URLSearchParams();
      q.set("format", format);
      q.set("mode", mode);
      
      if (mode === "SELECTED") {
        if (!customIds || customIds.length === 0) {
          toast.error("Pilih setidaknya satu barang", { id: toastId });
          return;
        }
        q.set("ids", customIds.join(","));
      }

      if (sortBy) q.set("sortBy", sortBy);
      if (sortDir) q.set("sortDir", sortDir);

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
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      a.download = `Export_Aset_${dateStr}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Data diekspor", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Gagal export", { id: toastId });
    }
  }

  async function handleSave() {
    if (!form.namaBarang || !form.kategori) {
      toast.error("Nama Barang dan Kategori wajib diisi");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      jumlah: Number(form.jumlah),
      tanggalDatang: form.tanggalDatang ? new Date(form.tanggalDatang).toISOString() : null,
      tanggalPindah: form.tanggalPindah ? new Date(form.tanggalPindah).toISOString() : null,
      harga: form.harga ? Number(form.harga) : null,
      ruanganId: form.ruangan || null,
      kategoriId: form.kategori,
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

  async function handleCheckUnprinted() {
    setIsCheckingUnprinted(true);
    try {
      const res = await api.get<{ count: number }>("/api/barang/unprinted-count");
      if (res.count === 0) {
        toast.error("Semua data barang sudah pernah dicetak!");
      } else {
        setConfirmUnprintedCount(res.count);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Gagal mengecek jumlah data");
    } finally {
      setIsCheckingUnprinted(false);
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

  /* ── Cek Barang handler ── */
  async function openCekBarang(b: Barang) {
    setSelected(b);
    setCekBarang(b);
    setCekInvoice(null);
    setCekLoading(true);
    setModal("cek");
    try {
      const res = await api.get<{ barang: Barang; pengeluaran: Pengeluaran | null }>(`/api/barang/${b.id}/invoice`);
      setCekBarang(res.barang);
      setCekInvoice(res.pengeluaran);
    } catch {
      // Invoice not found is fine, we still show barang detail
    } finally {
      setCekLoading(false);
    }
  }

  return (
    <>
      {/* Unified Action Bar, Filters, and Table Container */}
      <div className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 64 }}>

        {/* Top Header / Primary Actions */}
        <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)" }}>

          <div className="search-wrap" style={{ flex: "1 1 300px", minWidth: 250, margin: 0, position: "relative", display: "flex", alignItems: "center" }}>
            <i className="ti ti-search search-icon" />
            <input className="input" placeholder="Cari nama, label, label aset, kategori…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 90 }} />
            <button 
              onClick={async () => {
                setScanModalOpen(true);
                try {
                  await startCamera();
                } catch {
                  toast.error("Gagal mengakses kamera");
                }
              }} 
              title="Scan QR Code" 
              className="btn btn-ghost" 
              style={{ position: "absolute", right: 8, padding: "6px 12px", minWidth: "auto", height: "auto", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <i className="ti ti-qrcode" style={{ fontSize: 18 }} />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>Scan</span>
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            {role !== "UNIVERSITAS" && (
              <>
                <button className="btn btn-ghost" onClick={() => setModal("print_options")} title="Print QR Semua Barang (Bulk)">
                  <i className="ti ti-printer" /> Bulk Print
                </button>
                <button className="btn btn-ghost" style={{ border: "1px solid rgba(255,255,255,0.1)" }} onClick={() => setModal("export_options")}>
                  <i className="ti ti-download" /> Export
                </button>
                <button className="btn btn-primary" onClick={openAdd}>
                  <i className="ti ti-plus" /> Tambah
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar / Filters */}
        <div style={{ padding: "12px 24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ flex: "1 1 200px", minWidth: 160 }}>
            <LiquidSelectAsync
              value={filterKat}
              onChange={setFilterKat}
              fetchUrl="/api/kategori"
              placeholder="Semua Kategori..."
              mapOption={item => ({ value: item.id, label: item.nama })}
            />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 140 }}>
            <LiquidSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "", label: "Default (Terbaru)" },
                { value: "namaBarang", label: "Nama Barang" },
                { value: "tanggalDatang", label: "Tanggal Datang" },
                { value: "merek", label: "Merek" },
                { value: "kategoriId", label: "Jenis Kategori" },
                { value: "ruanganId", label: "Ruangan" },
                { value: "pengeluaranId", label: "Cashflow (Nota)" },
              ]}
            />
          </div>
          <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <LiquidSelect
              value={sortDir}
              onChange={setSortDir}
              options={
                sortBy === "tanggalDatang" || sortBy === ""
                  ? [
                    { value: "desc", label: "Terbaru" },
                    { value: "asc", label: "Terlama" },
                  ]
                  : [
                    { value: "asc", label: "A - Z (Menaik)" },
                    { value: "desc", label: "Z - A (Menurun)" },
                  ]
              }
            />
          </div>
          <button className="btn btn-ghost" style={{ flexShrink: 0 }} onClick={() => setFullPreview(true)}>
            <i className="ti ti-table" /> Full Preview
          </button>
        </div>

        {/* Table Content */}
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 600 }}>
            <thead>
                          <tr>
                <th style={{ width: "5%" }}>No</th>
                <th>Nama Barang</th>
                <th style={{ width: "14%" }}>Kategori</th>
                <th style={{ width: "14%" }}>Label</th>
                <th style={{ width: "14%" }}>Label Aset</th>
                <th style={{ width: "15%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
                            {barang.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <i className="ti ti-box-off" style={{ fontSize: 30 }} />
                      Belum ada data barang
                    </div>
                  </td>
                </tr>
              ) : barang.map((b, i) => (
                <tr key={b.id}>
                  <td className="td-sm text-muted">{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 500 }}>{b.namaBarang || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Tanpa Nama</span>}</span>
                      {b.status === "TERSEDIA" && <span className="badge badge-ok" style={{ fontSize: 10, padding: "2px 6px" }}>Tersedia</span>}
                      {b.status === "DIPINJAM" && <span className="badge badge-warn" style={{ fontSize: 10, padding: "2px 6px" }}>Dipinjam</span>}
                      {b.status === "MAINTENANCE" && <span className="badge badge-muted" style={{ fontSize: 10, padding: "2px 6px" }}>Mainte.</span>}
                    </div>
                    {b.progdi && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{b.progdi}</div>}
                  </td>
                  <td className="td-sm font-medium">{b.kategori.nama}</td>
                  <td className="td-code">{b.label || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                  <td className="td-code">{b.labelAset || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                  <td>
                    <div className="action-row">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openCekBarang(b)} title="Cek Barang">
                        <i className="ti ti-search" />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openQR(b)} title="QR Code">
                        <i className="ti ti-qrcode" />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Edit">
                        <i className="ti ti-edit" />
                      </button>
                      {role === "ADMIN" && (
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => setConfirmDel({ id: b.id, nama: b.namaBarang || b.kategori?.nama || "Barang" })} title="Hapus">
                          <i className="ti ti-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Menampilkan {barang.length} dari {totalCount} data
            </span>
            {cursor ? (
              <button className="btn btn-ghost btn-sm" onClick={() => load(false)} disabled={loadingMore}>
                {loadingMore ? <><div className="spinner spinner-sm" /> Memuat...</> : <>Muat Lebih Banyak <i className="ti ti-chevron-down" /></>}
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Semua data ditampilkan</span>
            )}
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <Modal open={scanModalOpen} onClose={() => { stopCamera(); setScanModalOpen(false); }} title="Scan QR Code Aset">
        <div style={{
          position: "relative", width: "100%", aspectRatio: "3/2", borderRadius: 10,
          overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 16,
        }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "scaleX(-1)" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-camera-off" style={{ fontSize: 28, color: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
            </div>
          )}
        </div>
      </Modal>

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

      {/* Print Unprinted Confirm */}
      <ConfirmModal
        isOpen={confirmUnprintedCount !== null}
        title="Cetak Data Belum Pernah Dicetak"
        message={`Apakah anda yakin ingin mencetak ${confirmUnprintedCount} data barang yang baru masuk/belum pernah dicetak?`}
        confirmLabel={`Cetak ${confirmUnprintedCount} Data`}
        onConfirm={() => handleBulkPrint("NOT_PRINTED")}
        onCancel={() => setConfirmUnprintedCount(null)}
      />

      <FullTablePreview isOpen={fullPreview} onClose={() => setFullPreview(false)} />

      {/* Edit/Add Modal */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Barang" : "Tambah Barang"}>
        <BarangFormFields form={form} onChange={handleFieldChange} />
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
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={handleCheckUnprinted} disabled={isCheckingUnprinted}>
            {isCheckingUnprinted ? (
              <><i className="ti ti-loader" style={{ color: "var(--color-ok)" }} /> Mengecek data...</>
            ) : (
              <><i className="ti ti-check" style={{ color: "var(--color-ok)" }} /> Print Belum Pernah Dicetak</>
            )}
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("TODAY")}>
            <i className="ti ti-calendar" style={{ color: "var(--color-info)" }} /> Print Data Hari Ini
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setModal("print_select")}>
            <i className="ti ti-file" style={{ color: "var(--ds-mist)" }} /> Print Barang Pilihan (Manual)
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleBulkPrint("ALL")}>
            <i className="ti ti-database" style={{ color: "var(--color-warn)" }} /> Print Seluruh Database
          </button>
        </div>
      </Modal>

      {/* Print Select Modal */}
      <Modal open={modal === "print_select"} onClose={() => { setModal(null); setSelectedPrintIds(new Set()); setPrintSearch(""); }} title="Pilih Barang untuk Dicetak">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: 300 }}>
          <div className="search-wrap" style={{ margin: 0 }}>
            <i className="ti ti-search search-icon" />
            <input
              className="input"
              placeholder="Cari nama, label, atau kategori..."
              value={printSearch}
              onChange={e => setPrintSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 350, background: "rgba(0,0,0,0.15)", borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
            {isSearchingPrint ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                <div className="spinner spinner-sm" style={{ margin: "0 auto 12px" }} />
                Mencari...
              </div>
            ) : printSearchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
                Tidak ada barang ditemukan.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {printSearchResults.map(b => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, cursor: "pointer", border: "1px solid transparent", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
                    <input
                      type="checkbox"
                      checked={selectedPrintIds.has(b.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedPrintIds);
                        if (e.target.checked) newSet.add(b.id);
                        else newSet.delete(b.id);
                        setSelectedPrintIds(newSet);
                      }}
                      style={{ width: 18, height: 18, accentColor: "var(--ds-mid)", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{b.kategori?.nama}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{b.labelAset || b.label || ""} • {b.kategori?.nama}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ borderTop: "none", paddingTop: 8, paddingBottom: 0 }}>
            <button className="btn btn-ghost" onClick={() => { setModal("print_options"); setSelectedPrintIds(new Set()); setPrintSearch(""); }}>Kembali</button>
            <button
              className="btn btn-primary"
              disabled={selectedPrintIds.size === 0}
              onClick={() => handleBulkPrint("SELECTED", Array.from(selectedPrintIds))}
            >
              <i className="ti ti-printer" /> Cetak ({selectedPrintIds.size}) QR
            </button>
          </div>
        </div>
      </Modal>

      {/* Hidden Bulk Print Area */}
      {bulkQrData && bulkQrData.length > 0 && (
        <div id="bulk-print-area">
          {bulkQrData.map((qr, idx) => (
            <div key={`bulk-qr-${idx}`} className="bulk-qr-item">
              <img src={qr.qrCode} alt="QR" />
              <div>{qr.kode}</div>
            </div>
          ))}
        </div>
      )}

      {/* Export Options Modal */}
      <UnifiedExportModal
        open={modal === "export_options"}
        onClose={() => setModal(null)}
        type="ASET"
        hasSelection={true}
        onSearchSelection={() => {
          setModal("export_select");
        }}
        onExport={(format, mode) => {
          handleBulkExport(mode, undefined, format);
        }}
      />

      {/* Export Select Modal */}
      <Modal open={modal === "export_select"} onClose={() => { setModal(null); setSelectedExportIds(new Set()); setExportSearch(""); }} title="Pilih Barang untuk Diekspor">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: 300 }}>
          <div className="search-wrap" style={{ margin: 0 }}>
            <i className="ti ti-search search-icon" />
            <input
              className="input"
              placeholder="Ketik nama atau label barang lalu tunggu sejenak..."
              value={exportSearch}
              onChange={e => setExportSearch(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", maxHeight: 350, background: "rgba(0,0,0,0.15)", borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
            {isSearchingExport ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                <div className="spinner spinner-sm" style={{ margin: "0 auto 12px" }} />
                Mencari...
              </div>
            ) : exportSearchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
                Tidak ada barang ditemukan.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {exportSearchResults.map(b => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, cursor: "pointer", border: "1px solid transparent", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
                    <input
                      type="checkbox"
                      checked={selectedExportIds.has(b.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedExportIds);
                        if (e.target.checked) newSet.add(b.id);
                        else newSet.delete(b.id);
                        setSelectedExportIds(newSet);
                      }}
                      style={{ width: 18, height: 18, accentColor: "var(--ds-mid)", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{b.kategori?.nama}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{b.labelAset || b.label || ""} • {b.kategori?.nama}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ borderTop: "none", paddingTop: 8, paddingBottom: 0 }}>
            <button className="btn btn-ghost" onClick={() => { setModal("export_options"); setSelectedExportIds(new Set()); setExportSearch(""); }}>Kembali</button>
            <button
              className="btn btn-primary"
              disabled={selectedExportIds.size === 0}
              onClick={() => handleBulkExport("SELECTED", Array.from(selectedExportIds))}
            >
              <i className="ti ti-download" /> Lanjut Opsi Export ({selectedExportIds.size}) Data
            </button>
          </div>
        </div>
      </Modal>

      {/* Cek Barang Modal (Detail + Invoice) */}
      <Modal open={modal === "cek"} onClose={() => setModal(null)} title={cekBarang ? `Detail: ${cekBarang.kategori?.nama || "Barang"}` : "Detail Barang"}>
        {cekLoading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Mengambil data…</span>
          </div>
        ) : cekBarang && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Barang Detail Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Label", value: cekBarang.label },
                { label: "Label Aset", value: cekBarang.labelAset },
                { label: "Kategori", value: cekBarang.kategori?.nama },
                { label: "Merek", value: cekBarang.merek },
                { label: "Model", value: cekBarang.model },
                { label: "Tipe", value: cekBarang.tipe },
                { label: "SN", value: cekBarang.sn },
                { label: "Vendor", value: cekBarang.vendor },
                { label: "Kondisi", value: cekBarang.kondisi },
                { label: "Status", value: cekBarang.status },
                { label: "Jumlah", value: String(cekBarang.jumlah) },
                { label: "Ruangan", value: cekBarang.ruangan ? `${cekBarang.ruangan.nama} (${cekBarang.ruangan.kode})` : null },
                { label: "Harga", value: cekBarang.harga ? `Rp ${cekBarang.harga.toLocaleString("id-ID")}` : null },
                { label: "Tanggal Datang", value: cekBarang.tanggalDatang ? fDateShort(cekBarang.tanggalDatang) : null },
                { label: "Sumber/Tahun", value: cekBarang.sumberTahun },
              ].filter(r => r.value).map(r => (
                <div key={r.label}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>{r.value}</span>
                </div>
              ))}
            </div>
            {cekBarang.keterangan && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Keterangan</span>
                <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{cekBarang.keterangan}</span>
              </div>
            )}

            {/* Invoice / Nota Section */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ti ti-receipt" style={{ fontSize: 18, color: "var(--color-info)" }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Nota Pembelian / Invoice</span>
              </div>
              {cekInvoice ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Judul</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{cekInvoice.judul}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Nominal</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>Rp {cekInvoice.nominal.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Tanggal</span>
                      <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{fDateShort(cekInvoice.tanggal)}</span>
                    </div>
                    {cekInvoice.kodePembelian && (
                      <div>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Kode Pembelian</span>
                        <span className="badge badge-info" style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>{cekInvoice.kodePembelian}</span>
                      </div>
                    )}
                  </div>
                  {cekInvoice.notaUrls && cekInvoice.notaUrls.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {cekInvoice.notaUrls.map((url, idx) => {
                        const ext = url.split(".").pop()?.toLowerCase() ?? "";
                        return (
                          <div key={idx} style={{ borderRadius: 8, overflow: "hidden" }}>
                            {["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? (
                              <img src={url} alt={`Nota ${idx + 1}`} style={{ width: "100%", maxHeight: 400, objectFit: "contain", background: "rgba(255,255,255,0.03)" }} />
                            ) : ext === "pdf" ? (
                              <iframe src={url} title={`Nota PDF ${idx + 1}`} style={{ width: "100%", height: 400, border: "1px solid rgba(255,255,255,0.1)" }} />
                            ) : (
                              <div style={{ textAlign: "center", padding: 24, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                                <a href={url} download className="btn btn-primary" target="_blank" rel="noopener">
                                  <i className="ti ti-download" /> Download File Nota {idx + 1}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                  <i className="ti ti-file-off" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                  Tidak ada invoice/nota yang terhubung dengan barang ini.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
