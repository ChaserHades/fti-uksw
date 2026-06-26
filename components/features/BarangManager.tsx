// app/admin/barang/page.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { parseQrPayload } from "@/helpers/format";
import ConfirmModal from "@/components/ConfirmModal";
import type { Barang, JenisBarang, Letak } from "@/types";
import ExportModal from "./ExportModal";
import FullTablePreview from "./FullTablePreview";
import LetakManager from "./LetakManager";
import ImportDraftView from "./ImportDraftView";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

type Tab = "daftar" | "add" | "jenis-barang" | "letak";
type AddMode = "scan" | "manual" | "import";

const EMPTY = {
  label: "", labelAset: "", nama: "", sn: "", merek: "", model: "", tipe: "", vendor: "", keterangan: "", kondisi: "BAIK",
  jumlah: 1, tanggalDatang: "", tanggalPindah: "", harga: "", jenisBarangId: "", letakId: "",
};

export default function BarangManager({ role = "ADMIN" }: { role?: string }) {
  const [tab, setTab] = useState<Tab>("daftar");

  const availableTabs = [
    { key: "daftar" as Tab, icon: "ti-list", label: "Daftar Barang" },
  ];
  if (role === "ADMIN") {
    availableTabs.push({ key: "add" as Tab, icon: "ti-plus", label: "Add Item" });
    availableTabs.push({ key: "jenis-barang" as Tab, icon: "ti-category", label: "Jenis Barang" });
    availableTabs.push({ key: "letak" as Tab, icon: "ti-building", label: "Letak / Ruangan" });
  }

  return (
    <div className="animate-fade-in">
      {/* Tab switcher */}
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {availableTabs.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FFF" : "var(--text-secondary)",
                background: "transparent",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer",
                marginBottom: "-1px", whiteSpace: "nowrap", flexShrink: 0
              }}
            >
              <i className={`ti ${t.icon}`} style={{ opacity: active ? 1 : 0.6 }} />{t.label}
            </button>
          );
        })}
      </div>

      {tab === "daftar"   && <DaftarTab role={role} />}
      {tab === "add"      && role === "ADMIN" && <AddItemTab />}
      {tab === "jenis-barang" && role === "ADMIN" && <KategoriTab />}
      {tab === "letak"    && role === "ADMIN" && <LetakManager role={role} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Daftar Barang (existing CRUD)
// ══════════════════════════════════════════════════════════════════════════════
function DaftarTab({ role }: { role: string }) {
  const [barang,    setBarang]    = useState<Barang[]>([]);
  const [jenisBarang,  setJenisBarang]  = useState<JenisBarang[]>([]);
  const [letak,   setLetak]   = useState<Letak[]>([]);
  const [search,    setSearch]    = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [modal,     setModal]     = useState<"form" | "qr" | "bulk-qr" | null>(null);
  const [selected,  setSelected]  = useState<Barang | null>(null);
  const [form,      setForm]      = useState<typeof EMPTY>(EMPTY);
  const [qrData,    setQrData]    = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [bulkQrData, setBulkQrData] = useState<{ qrCode: string; kode: string; nama: string }[] | null>(null);
  const [saving,    setSaving]    = useState(false);

  const [confirmDel, setConfirmDel] = useState<{ id: string, nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [sortBy, setSortBy] = useState("tanggalDatang");
  const [sortDir, setSortDir] = useState("desc");
  const [fullPreview, setFullPreview] = useState(false);

  const load = useCallback((reset = true) => {
    const currentCursor = reset ? null : cursor;
    const p = new URLSearchParams();
    if (search)    p.set("search",    search);
    if (filterKat) p.set("jenisBarangId", filterKat);
    if (sortBy)    p.set("sortBy", sortBy);
    if (sortDir)   p.set("sortDir", sortDir);
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
    api.get<JenisBarang[]>("/api/jenis-barang").then(setJenisBarang);
    api.get<Letak[]>("/api/letak").then(setLetak);
  }, []);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() { setSelected(null); setForm(EMPTY); setModal("form"); }
  function openEdit(b: Barang) {
    setSelected(b);
    setForm({
      label: b.label || "", labelAset: b.labelAset || "", nama: b.nama, sn: b.sn || "",
      merek: b.merek || "", model: b.model || "", tipe: b.tipe || "", vendor: b.vendor || "",
      keterangan: b.keterangan || "",
      kondisi: b.kondisi, jumlah: b.jumlah,
      tanggalDatang: b.tanggalDatang ? new Date(b.tanggalDatang).toISOString().split('T')[0] : "",
      tanggalPindah: b.tanggalPindah ? new Date(b.tanggalPindah).toISOString().split('T')[0] : "",
      harga: b.harga?.toString() || "",
      jenisBarangId: b.jenisBarangId, letakId: b.letakId || "",
    });
    setModal("form");
  }

  async function openQR(b: Barang) {
    setSelected(b);
    try {
      const data = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${b.id}/qr`);
      setQrData(data);
      setModal("qr");
    } catch { toast.error("Gagal generate QR"); }
  }

  async function handleBulkPrint() {
    if (barang.length === 0) {
      toast.error("Tidak ada barang untuk di-print");
      return;
    }
    const toastId = toast.loading("Mempersiapkan dokumen cetak...");
    try {
      const ids = barang.map(b => b.id);
      const res = await api.post<{ qrCode: string; kode: string; nama: string }[]>("/api/barang/qr-bulk", { ids });
      setBulkQrData(res);
      toast.success("Siap dicetak!", { id: toastId });
      // Beri waktu 500ms agar DOM ter-update sebelum memanggil window.print()
      setTimeout(() => {
        window.print();
      }, 500);
    } catch {
      toast.error("Gagal menyiapkan dokumen cetak", { id: toastId });
    }
  }

  async function handleSave() {
    if (!form.label || !form.nama || !form.jenisBarangId) {
      toast.error("Label, nama, dan kategori wajib diisi"); return;
    }
    setSaving(true);
    const body = {
      ...form,
      jumlah:    Number(form.jumlah),
      tanggalDatang: form.tanggalDatang ? new Date(form.tanggalDatang).toISOString() : null,
      tanggalPindah: form.tanggalPindah ? new Date(form.tanggalPindah).toISOString() : null,
      harga:     form.harga     ? Number(form.harga)     : null,
      letakId: form.letakId || null,
    };
    try {
      if (selected) {
        await api.put(`/api/barang/${selected.id}`, body);
        toast.success("Barang diperbarui");
      } else {
        await api.post("/api/barang", body);
        toast.success("Barang ditambahkan");
      }
      setModal(null); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  function handleDelete(id: string, nama: string) {
    setConfirmDel({ id, nama });
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/barang/${confirmDel.id}`);
      toast.success("Barang dihapus"); load();
    } catch (e: any) { 
      toast.error(e.message || "Gagal menghapus"); 
    } finally {
      setIsDeleting(false);
      setConfirmDel(null);
    }
  }

  const kondisiBadge: Record<string, string> = { BAIK: "badge-ok", RUSAK_RINGAN: "badge-warn", RUSAK_BERAT: "badge-danger" };
  const statusBadge: Record<string, string> = { TERSEDIA: "badge-ok", DIPINJAM: "badge-warn", MAINTENANCE: "badge-muted" };

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
              { value: "", label: "Semua Jenis Barang" },
              ...jenisBarang.map(k => ({ value: k.id, label: k.nama }))
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
              { value: "jenisBarangId", label: "Sort: Jenis" },
              { value: "letakId", label: "Sort: Letak" },
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
            <button className="btn btn-ghost" onClick={handleBulkPrint} title="Print QR Semua Barang (Bulk)">
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
                <th>Jenis Barang</th>
                <th style={{ width: "20%" }}>Label</th>
                <th style={{ width: "20%" }}>Label Aset</th>
                <th style={{ width: "15%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><i className="ti ti-box-off" style={{ fontSize: 30 }} />Tidak ada data barang</div></td></tr>
              ) : barang.map((b, i) => (
                <tr key={b.id}>
                  <td className="td-sm text-muted">{i + 1}</td>
                  <td className="td-sm font-medium">{b.jenisBarang.nama}</td>
                  <td className="td-code">{b.label || "-"}</td>
                  <td className="td-code">{b.labelAset || "-"}</td>
                  <td>
                    <div className="action-row">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openQR(b)} title="QR Code"><i className="ti ti-qrcode" /></button>
                      {role === "ADMIN" && (
                        <>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Edit"><i className="ti ti-edit" /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(b.id, b.nama)} title="Hapus"><i className="ti ti-trash" /></button>
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
        title="Hapus Barang"
        message={`Apakah Anda yakin ingin menghapus barang "${confirmDel?.nama}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      <FullTablePreview 
        isOpen={fullPreview} 
        onClose={() => setFullPreview(false)} 
      />

      {/* Modal Form */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Barang" : "Tambah Barang"}>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kode Barang (Label)</label>
            <input className="input" placeholder="BRG-001" value={form.label} onChange={e => setF("label", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Label Aset</label>
            <input className="input" placeholder="LBL-AST-01" value={form.labelAset} onChange={e => setF("labelAset", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="S/N" value={form.sn} onChange={e => setF("sn", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Barang *</label>
          <input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} />
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Merek</label>
            <input className="input" placeholder="Merek barang" value={form.merek} onChange={e => setF("merek", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Model</label>
            <input className="input" placeholder="Model barang" value={form.model} onChange={e => setF("model", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipe</label>
            <input className="input" placeholder="Tipe barang" value={form.tipe} onChange={e => setF("tipe", e.target.value)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vendor / Supplier</label>
            <input className="input" placeholder="Nama vendor" value={form.vendor} onChange={e => setF("vendor", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <LiquidSelect
              value={form.kondisi}
              onChange={val => setF("kondisi", val)}
              options={[
                { value: "BAIK", label: "Baik" },
                { value: "RUSAK_RINGAN", label: "Rusak Ringan" },
                { value: "RUSAK_BERAT", label: "Rusak Berat" }
              ]}
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jenis Barang *</label>
            <LiquidSelect
              value={form.jenisBarangId}
              onChange={val => setF("jenisBarangId", val)}
              options={[
                { value: "", label: "— Pilih jenis barang —" },
                ...jenisBarang.map(k => ({ value: k.id, label: k.nama }))
              ]}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Letak</label>
            <LiquidSelect
              value={form.letakId}
              onChange={val => setF("letakId", val)}
              options={[
                { value: "", label: "Tidak ada" },
                ...letak.map(r => ({ value: r.id, label: `${r.kode} — ${r.nama}` }))
              ]}
            />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jumlah</label>
            <input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tgl Datang</label>
            <input type="date" className="input" value={form.tanggalDatang} onChange={e => setF("tanggalDatang", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tgl Pindah</label>
            <input type="date" className="input" value={form.tanggalPindah} onChange={e => setF("tanggalPindah", e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Harga (Rp)</label>
          <input type="number" className="input" placeholder="0" value={form.harga} onChange={e => setF("harga", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setF("keterangan", e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}
          </button>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={modal === "qr"} onClose={() => setModal(null)} title="QR Code Barang">
        {qrData && (() => {
          const downloadQR = () => {
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
          };

          return (
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
          );
        })()}
      </Modal>

      {/* Hidden Bulk Print Area (Hanya muncul saat dicetak) */}
      {bulkQrData && bulkQrData.length > 0 && (
        <div id="bulk-print-area">
          {bulkQrData.map((qr) => (
            <div key={qr.kode} className="bulk-qr-item">
              <img src={qr.qrCode} alt="QR" />
              <div>{qr.kode}</div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Barang"
        message={`Yakin ingin menghapus ${confirmDel?.nama}?`}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
        isLoading={isDeleting}
        danger
      />

      {showExport && (
        <ExportModal 
          open={showExport} 
          onClose={() => setShowExport(false)} 
          jenisBarangList={jenisBarang} 
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Add Item (Scan QR / Manual / Import CSV)
// ══════════════════════════════════════════════════════════════════════════════
function AddItemTab() {
  const [addMode, setAddMode] = useState<AddMode>("manual");

  return (
    <>
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {([
          { key: "scan" as AddMode,   icon: "ti-qrcode",      label: "Scan QR" },
          { key: "manual" as AddMode, icon: "ti-forms",        label: "Manual Input" },
          { key: "import" as AddMode, icon: "ti-file-upload",  label: "Import CSV" },
        ]).map(m => {
          const active = addMode === m.key;
          return (
            <button 
              key={m.key} 
              onClick={() => setAddMode(m.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FFF" : "var(--text-secondary)",
                background: "transparent",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer",
                marginBottom: "-1px", whiteSpace: "nowrap", flexShrink: 0
              }}
            >
              <i className={`ti ${m.icon}`} style={{ opacity: active ? 1 : 0.6 }} />{m.label}
            </button>
          );
        })}
      </div>

      {addMode === "scan"   && <ScanRegisterSection />}
      {addMode === "manual" && <ManualAddSection />}
      {addMode === "import" && <ImportSection />}
    </>
  );
}

// ── Scan QR → Register ──
function ScanRegisterSection() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const jsqrReady = useRef(false);

  const [scanning,    setScanning]    = useState(false);
  const [scannedKode, setScannedKode] = useState("");
  const [foundBarang, setFoundBarang] = useState<Barang | null>(null);

  const [registerModal, setRegisterModal] = useState(false);
  const [form, setForm]   = useState<typeof EMPTY>(EMPTY);
  const [jenisBarang, setJenisBarang] = useState<JenisBarang[]>([]);
  const [letak, setLetak]   = useState<Letak[]>([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get<JenisBarang[]>("/api/jenis-barang").then(setJenisBarang);
    api.get<Letak[]>("/api/letak").then(setLetak);
  }, []);

  useEffect(() => {
    if (document.getElementById("jsqr-script")) { jsqrReady.current = true; return; }
    const s = document.createElement("script");
    s.id = "jsqr-script"; s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);
  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setScannedKode(""); setFoundBarang(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      const v = videoRef.current!; v.srcObject = stream; await v.play();
      setScanning(true); scanLoop();
    } catch { toast.error("Tidak dapat mengakses kamera"); }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  function scanLoop() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!jsqrReady.current || video.readyState < video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scanLoop); return; }
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (code?.data) { stopCamera(); handleScanResult(code.data); return; }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  async function handleScanResult(raw: string) {
    const kode = parseQrPayload(raw);
    setScannedKode(kode);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      setFoundBarang(data);
      toast.success(`Barang "${data.nama}" sudah terdaftar di database`);
    } catch {
      setForm({ ...EMPTY, label: kode });
      setRegisterModal(true);
    }
  }

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleRegister() {
    if (!form.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!form.jenisBarangId) { toast.error("Jenis barang wajib dipilih"); return; }
    setSaving(true);
    try {
      await api.post("/api/barang", {
        ...form, jumlah: Number(form.jumlah) || 1,
        tanggalDatang: form.tanggalDatang || null,
        tanggalPindah: form.tanggalPindah || null,
        harga: form.harga ? Number(form.harga) : null,
        letakId: form.letakId || null, hasSticker: true,
      });
      toast.success(`Barang "${form.nama}" berhasil diregistrasi!`);
      setRegisterModal(false); setScannedKode(""); setForm(EMPTY);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal registrasi");
    } finally { setSaving(false); }
  }

  return (
    <div className="scan-container">
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading">
          <div className="scan-title">Scan QR / Barcode Aset</div>
          <div className="scan-sub">Sudah di DB → tampil info &nbsp;·&nbsp; Belum → form registrasi baru</div>
        </div>
        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", background: "#000", border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`, marginBottom: 16 }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none", transform: "none" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <i className="ti ti-camera-off" style={{ fontSize: 36, color: "var(--text-muted)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Kamera tidak aktif</span>
            </div>
          )}
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 180, height: 180, borderRadius: 10, border: "2px solid var(--color-ok)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!scanning
            ? <button className="btn btn-primary" onClick={startCamera}><i className="ti ti-camera" />Buka Kamera</button>
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" />Stop Kamera</button>}
          {scannedKode && !scanning && (
            <button className="btn btn-ghost" onClick={() => { setScannedKode(""); setFoundBarang(null); startCamera(); }}><i className="ti ti-refresh" />Scan Ulang</button>
          )}
        </div>
        {scannedKode && !scanning && foundBarang && (
          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <i className="ti ti-check" /> Barang <strong>{foundBarang.nama}</strong> ({foundBarang.label}) sudah terdaftar.
          </div>
        )}
      </div>

      <Modal open={registerModal} onClose={() => { setRegisterModal(false); setForm(EMPTY); }} title="Register Barang Baru">
        <div className="alert alert-warn mb-16">
          <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
          Kode <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{scannedKode}</span> belum terdaftar.
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kode Barang <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(dari sticker)</span></label>
            <input className="input" value={form.label} readOnly style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <LiquidSelect
              value={form.kondisi}
              onChange={val => setF("kondisi", val)}
              options={[
                { value: "BAIK", label: "Baik" },
                { value: "RUSAK_RINGAN", label: "Rusak Ringan" },
                { value: "RUSAK_BERAT", label: "Rusak Berat" }
              ]}
            />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Nama Barang *</label><input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} autoFocus /></div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Merek</label>
            <input className="input" placeholder="Merek barang" value={form.merek} onChange={e => setF("merek", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipe</label>
            <input className="input" placeholder="Model / Tipe" value={form.tipe} onChange={e => setF("tipe", e.target.value)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="S/N" value={form.sn} onChange={e => setF("sn", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vendor / Supplier</label>
            <input className="input" placeholder="Nama vendor" value={form.vendor} onChange={e => setF("vendor", e.target.value)} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jenis Barang *</label>
            <LiquidSelect
              value={form.jenisBarangId}
              onChange={val => setF("jenisBarangId", val)}
              options={[
                { value: "", label: "— Pilih —" },
                ...jenisBarang.map(k => ({ value: k.id, label: k.nama }))
              ]}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Letak</label>
            <LiquidSelect
              value={form.letakId}
              onChange={val => setF("letakId", val)}
              options={[
                { value: "", label: "Tidak ada" },
                ...letak.map(r => ({ value: r.id, label: `${r.kode} — ${r.nama}` }))
              ]}
            />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Jumlah</label><input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tgl Datang</label><input type="date" className="input" value={form.tanggalDatang} onChange={e => setF("tanggalDatang", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tgl Pindah</label><input type="date" className="input" value={form.tanggalPindah} onChange={e => setF("tanggalPindah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Harga (Rp)</label><input type="number" className="input" placeholder="0" value={form.harga} onChange={e => setF("harga", e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => { setRegisterModal(false); setForm(EMPTY); }}>Batal</button>
          <button className="btn btn-primary" onClick={handleRegister} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <><i className="ti ti-plus" />Register Barang</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Manual Add (auto-generate QR → print) ──
function ManualAddSection() {
  const [jenisBarang, setJenisBarang] = useState<JenisBarang[]>([]);
  const [letak, setLetak]   = useState<Letak[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [qrResult, setQrResult] = useState<{ qrCode: string; kode: string; nama: string } | null>(null);

  useEffect(() => {
    api.get<JenisBarang[]>("/api/jenis-barang").then(setJenisBarang);
    api.get<Letak[]>("/api/letak").then(setLetak);
  }, []);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.label || !form.nama || !form.jenisBarangId) {
      toast.error("Label, nama, dan kategori wajib diisi"); return;
    }
    setSaving(true);
    try {
      const created = await api.post<Barang>("/api/barang", {
        ...form, jumlah: Number(form.jumlah) || 1,
        tanggalDatang: form.tanggalDatang || null,
        tanggalPindah: form.tanggalPindah || null,
        harga: form.harga ? Number(form.harga) : null,
        letakId: form.letakId || null,
      });
      // Auto-generate QR
      const qr = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${created.id}/qr`);
      setQrResult(qr);
      toast.success("Barang ditambahkan! QR Code siap di-print.");
      setForm(EMPTY);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading" style={{ marginBottom: 16 }}>
          <div className="scan-title">Input Manual Barang Baru</div>
          <div className="scan-sub">Barang tanpa QR → auto-generate QR → langsung Print</div>
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kode Barang *</label>
            <input className="input" placeholder="BRG-001" value={form.label} onChange={e => setF("label", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <LiquidSelect
              value={form.kondisi}
              onChange={val => setF("kondisi", val)}
              options={[
                { value: "BAIK", label: "Baik" },
                { value: "RUSAK_RINGAN", label: "Rusak Ringan" },
                { value: "RUSAK_BERAT", label: "Rusak Berat" }
              ]}
            />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Nama Barang *</label><input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} /></div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jenis Barang *</label>
            <LiquidSelect
              value={form.jenisBarangId}
              onChange={val => setF("jenisBarangId", val)}
              options={[
                { value: "", label: "— Pilih —" },
                ...jenisBarang.map(k => ({ value: k.id, label: k.nama }))
              ]}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Letak</label>
            <LiquidSelect
              value={form.letakId}
              onChange={val => setF("letakId", val)}
              options={[
                { value: "", label: "Tidak ada" },
                ...letak.map(r => ({ value: r.id, label: `${r.kode} — ${r.nama}` }))
              ]}
            />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Jumlah</label><input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tgl Datang</label><input type="date" className="input" value={form.tanggalDatang} onChange={e => setF("tanggalDatang", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tgl Pindah</label><input type="date" className="input" value={form.tanggalPindah} onChange={e => setF("tanggalPindah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Harga (Rp)</label><input type="number" className="input" placeholder="0" value={form.harga} onChange={e => setF("harga", e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Deskripsi</label><input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setF("keterangan", e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <><i className="ti ti-plus" />Tambah & Generate QR</>}
          </button>
        </div>
      </div>

      {/* QR Result Modal */}
      <Modal open={!!qrResult} onClose={() => setQrResult(null)} title="QR Code Berhasil Dibuat">
        {qrResult && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrResult.nama}</div>
            
            <div id="print-qr-area" style={{ background: "#fff", padding: "24px", borderRadius: "12px", display: "inline-block", margin: "16px auto 20px" }}>
              <img src={qrResult.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block", marginBottom: 16 }} />
              <div style={{ fontSize: 18, color: "#000", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "2px" }}>
                {qrResult.kode}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }} className="no-print">
              <button className="btn btn-primary" onClick={() => window.print()}>
                <i className="ti ti-printer" /> Print Langsung
              </button>
              <a href={qrResult.qrCode} download={`${qrResult.kode}-qr.png`} className="btn btn-ghost" style={{ display: "inline-flex" }}>
                <i className="ti ti-download" /> Download PNG
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Import CSV/Excel ──
function ImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [draftData, setDraftData] = useState<{ valid: any[]; error: any[]; sumberTahun: string; total: number } | null>(null);
  const [pushing, setPushing] = useState(false);

  async function handlePreview() {
    if (!file) { toast.error("Pilih file terlebih dahulu"); return; }
    setImporting(true); setDraftData(null);
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
    } finally { setImporting(false); }
  }

  async function handlePush(validData: any[]) {
    setPushing(true);
    try {
      const res = await fetch("/api/barang/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: validData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal push ke database");
      toast.success(`${data.stats?.inserted + data.stats?.updated} barang berhasil dipush ke database`);
      setDraftData(null);
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal push");
    } finally { setPushing(false); }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {!draftData ? (
        <div className="glass" style={{ padding: 24 }}>
          <div className="scan-heading" style={{ marginBottom: 16 }}>
            <div className="scan-title">Import CSV / Excel</div>
            <div className="scan-sub">Unggah file aset. Data akan masuk ke draf (Pre-flight Check) sebelum disimpan permanen.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Pilih File CSV / Excel</label>
            <input type="file" className="input" accept=".csv,.xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] ?? null); setDraftData(null); }} />
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
            {importing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-file-search" />Review Draft</>}
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
// ══════════════════════════════════════════════════════════════════════════════
// Tab: Kategori CRUD
// ══════════════════════════════════════════════════════════════════════════════
function KategoriTab() {
  const [list, setList]         = useState<JenisBarang[]>([]);
  const [modal, setModal]       = useState(false);
  const [selected, setSelected] = useState<JenisBarang | null>(null);
  const [form, setForm]         = useState({ nama: "", keterangan: "" });
  const [saving, setSaving]     = useState(false);

  const [confirmDel, setConfirmDel] = useState<{ id: string, nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = () => api.get<JenisBarang[]>("/api/jenis-barang").then(setList).catch(console.error);
  useEffect(() => { load(); }, []);

  function openAdd()  { setSelected(null); setForm({ nama: "", keterangan: "" }); setModal(true); }
  function openEdit(k: JenisBarang) { setSelected(k); setForm({ nama: k.nama, keterangan: k.keterangan ?? "" }); setModal(true); }

  async function handleSave() {
    if (!form.nama) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      if (selected) { await api.put(`/api/jenis-barang/${selected.id}`, form); toast.success("Kategori diperbarui"); }
      else { await api.post("/api/jenis-barang", form); toast.success("Kategori ditambahkan"); }
      setModal(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  function handleDelete(id: string, nama: string) {
    setConfirmDel({ id, nama });
  }

  async function performDelete() {
    if (!confirmDel) return;
    setIsDeleting(true);
    try { await api.delete(`/api/jenis-barang/${confirmDel.id}`); toast.success("Dihapus"); load(); }
    catch { toast.error("Gagal — mungkin masih ada barang di kategori ini"); }
    finally { setIsDeleting(false); setConfirmDel(null); }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd}><i className="ti ti-plus" /> Tambah Jenis Barang</button>
      </div>
      <div className="glass">
        <table className="table">
          <thead><tr><th>#</th><th>Nama Jenis Barang</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><i className="ti ti-category-minus" style={{ fontSize: 28 }} />Belum ada jenis barang</div></td></tr>
            ) : list.map((k, i) => (
              <tr key={k.id}>
                <td className="td-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td className="td-name">{k.nama}</td>
                <td>{k.keterangan ?? "—"}</td>
                <td>
                  <div className="action-row">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(k)}><i className="ti ti-edit" /></button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(k.id, k.nama)}><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!confirmDel}
        title="Hapus Jenis Barang"
        message={`Apakah Anda yakin ingin menghapus kategori "${confirmDel?.nama}"?`}
        danger
        isLoading={isDeleting}
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />

      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Jenis Barang" : "Tambah Jenis Barang"}>
        <div className="form-group"><label className="form-label">Nama Jenis Barang *</label><input className="input" placeholder="Komputer…" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Deskripsi</label><input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}</button>
        </div>
      </Modal>
    </>
  );
}