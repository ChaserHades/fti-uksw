// app/admin/barang/page.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang, KategoriBarang, Ruangan } from "@/types";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

type Tab = "daftar" | "add" | "kategori";
type AddMode = "scan" | "manual" | "import";

const EMPTY = {
  kodeBarang: "", nama: "", deskripsi: "", kondisi: "BAIK",
  jumlah: 1, tahunBeli: "", harga: "", kategoriId: "", ruanganId: "",
};

function parseQrPayload(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.kode && typeof parsed.kode === "string") return parsed.kode;
  } catch { /* plain string */ }
  return trimmed;
}

export default function BarangPage() {
  const [tab, setTab] = useState<Tab>("daftar");

  return (
    <>
      <PageHeader title="Manajemen Barang" subtitle="Kelola inventaris aset FTI UKSW" />

      {/* Tab switcher */}
      <div className="mode-switcher">
        {([
          { key: "daftar" as Tab, icon: "ti-list",     label: "Daftar Barang" },
          { key: "add" as Tab,    icon: "ti-plus",     label: "Add Item" },
          { key: "kategori" as Tab, icon: "ti-category", label: "Kategori" },
        ]).map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {tab === "daftar"   && <DaftarTab />}
      {tab === "add"      && <AddItemTab />}
      {tab === "kategori" && <KategoriTab />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Daftar Barang (existing CRUD)
// ══════════════════════════════════════════════════════════════════════════════
function DaftarTab() {
  const [barang,    setBarang]    = useState<Barang[]>([]);
  const [kategori,  setKategori]  = useState<KategoriBarang[]>([]);
  const [ruangan,   setRuangan]   = useState<Ruangan[]>([]);
  const [search,    setSearch]    = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [modal,     setModal]     = useState<"form" | "qr" | null>(null);
  const [selected,  setSelected]  = useState<Barang | null>(null);
  const [form,      setForm]      = useState<typeof EMPTY>(EMPTY);
  const [qrData,    setQrData]    = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search)    p.set("search",    search);
    if (filterKat) p.set("kategoriId", filterKat);
    api.get<Barang[]>(`/api/barang?${p}`).then(setBarang).catch(console.error);
  }, [search, filterKat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<KategoriBarang[]>("/api/kategori").then(setKategori);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan);
  }, []);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() { setSelected(null); setForm(EMPTY); setModal("form"); }
  function openEdit(b: Barang) {
    setSelected(b);
    setForm({
      kodeBarang: b.kodeBarang, nama: b.nama, deskripsi: b.deskripsi ?? "",
      kondisi: b.kondisi, jumlah: b.jumlah,
      tahunBeli: b.tahunBeli?.toString() ?? "", harga: b.harga?.toString() ?? "",
      kategoriId: b.kategoriId, ruanganId: b.ruanganId ?? "",
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

  async function handleSave() {
    if (!form.kodeBarang || !form.nama || !form.kategoriId) {
      toast.error("Kode, nama, dan kategori wajib diisi"); return;
    }
    setSaving(true);
    const body = {
      ...form,
      jumlah:    Number(form.jumlah),
      tahunBeli: form.tahunBeli ? Number(form.tahunBeli) : null,
      harga:     form.harga     ? Number(form.harga)     : null,
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
      setModal(null); load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus barang "${nama}"?`)) return;
    try {
      await api.delete(`/api/barang/${id}`);
      toast.success("Barang dihapus"); load();
    } catch { toast.error("Gagal menghapus"); }
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
        <select className="select" style={{ flex: "0 1 180px" }} value={filterKat} onChange={e => setFilterKat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Tambah
        </button>
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Kode</th>
                <th style={{ width: "25%" }}>Nama</th>
                <th style={{ width: "15%" }}>Kategori</th>
                <th style={{ width: "12%" }}>Kondisi</th>
                <th style={{ width: "12%" }}>Status</th>
                <th style={{ width: "6%" }}>Jml</th>
                <th style={{ width: "17%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><i className="ti ti-box-off" style={{ fontSize: 30 }} />Tidak ada data barang</div></td></tr>
              ) : barang.map(b => (
                <tr key={b.id}>
                  <td className="td-code">{b.kodeBarang}</td>
                  <td>
                    <div className="td-name">{b.nama}</div>
                    {b.ruangan && <div className="td-code"><i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {b.ruangan.kode}</div>}
                  </td>
                  <td className="td-sm">{b.kategori.nama}</td>
                  <td><span className={`badge ${kondisiBadge[b.kondisi] ?? "badge-muted"}`}>{b.kondisi.replace(/_/g, " ")}</span></td>
                  <td><span className={`badge ${statusBadge[b.status] ?? "badge-muted"}`}>{b.status}</span></td>
                  <td style={{ fontSize: 13 }}>{b.jumlah}</td>
                  <td>
                    <div className="action-row" style={{ flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openQR(b)} title="QR Code"><i className="ti ti-qrcode" /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)} title="Edit"><i className="ti ti-edit" /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(b.id, b.nama)} title="Hapus"><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={modal === "form"} onClose={() => setModal(null)} title={selected ? "Edit Barang" : "Tambah Barang"}>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kode Barang *</label>
            <input className="input" placeholder="BRG-001" value={form.kodeBarang} onChange={e => setF("kodeBarang", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <select className="select" value={form.kondisi} onChange={e => setF("kondisi", e.target.value)}>
              <option value="BAIK">Baik</option><option value="RUSAK_RINGAN">Rusak Ringan</option><option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Barang *</label>
          <input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} />
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kategori *</label>
            <select className="select" value={form.kategoriId} onChange={e => setF("kategoriId", e.target.value)}>
              <option value="">— Pilih kategori —</option>
              {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Ruangan</label>
            <select className="select" value={form.ruanganId} onChange={e => setF("ruanganId", e.target.value)}>
              <option value="">Tidak ada</option>
              {ruangan.map(r => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jumlah</label>
            <input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tahun Beli</label>
            <input type="number" className="input" placeholder="2024" value={form.tahunBeli} onChange={e => setF("tahunBeli", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Harga (Rp)</label>
            <input type="number" className="input" placeholder="0" value={form.harga} onChange={e => setF("harga", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={e => setF("deskripsi", e.target.value)} />
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
        {qrData && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrData.nama}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, fontFamily: "monospace" }}>{qrData.kode}</div>
            <img src={qrData.qrCode} alt="QR" style={{ width: 200, height: 200, borderRadius: 12, margin: "0 auto 20px", display: "block", background: "#fff", padding: 8 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <a href={qrData.qrCode} download={`${qrData.kode}-qr.png`} className="btn btn-primary btn-sm" style={{ display: "inline-flex" }}>
                <i className="ti ti-download" /> Download PNG
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                <i className="ti ti-printer" /> Print
              </button>
            </div>
          </div>
        )}
      </Modal>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([
          { key: "scan" as AddMode,   icon: "ti-qrcode",      label: "Scan QR" },
          { key: "manual" as AddMode, icon: "ti-forms",        label: "Manual Input" },
          { key: "import" as AddMode, icon: "ti-file-upload",  label: "Import CSV" },
        ]).map(m => (
          <button key={m.key} className={`btn btn-sm ${addMode === m.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setAddMode(m.key)}>
            <i className={`ti ${m.icon}`} />{m.label}
          </button>
        ))}
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
  const [kategori, setKategori] = useState<KategoriBarang[]>([]);
  const [ruangan, setRuangan]   = useState<Ruangan[]>([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get<KategoriBarang[]>("/api/kategori").then(setKategori);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan);
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
      setForm({ ...EMPTY, kodeBarang: kode });
      setRegisterModal(true);
    }
  }

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleRegister() {
    if (!form.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!form.kategoriId) { toast.error("Kategori wajib dipilih"); return; }
    setSaving(true);
    try {
      await api.post("/api/barang", {
        ...form, jumlah: Number(form.jumlah) || 1,
        tahunBeli: form.tahunBeli ? Number(form.tahunBeli) : null,
        harga: form.harga ? Number(form.harga) : null,
        ruanganId: form.ruanganId || null, hasSticker: true,
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
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none" }} />
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
            <i className="ti ti-check" /> Barang <strong>{foundBarang.nama}</strong> ({foundBarang.kodeBarang}) sudah terdaftar.
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
            <input className="input" value={form.kodeBarang} readOnly style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <select className="select" value={form.kondisi} onChange={e => setF("kondisi", e.target.value)}>
              <option value="BAIK">Baik</option><option value="RUSAK_RINGAN">Rusak Ringan</option><option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Nama Barang *</label><input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} autoFocus /></div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Kategori *</label><select className="select" value={form.kategoriId} onChange={e => setF("kategoriId", e.target.value)}><option value="">— Pilih —</option>{kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Ruangan</label><select className="select" value={form.ruanganId} onChange={e => setF("ruanganId", e.target.value)}><option value="">Tidak ada</option>{ruangan.map(r => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}</select></div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Jumlah</label><input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tahun Beli</label><input type="number" className="input" placeholder="2024" value={form.tahunBeli} onChange={e => setF("tahunBeli", e.target.value)} /></div>
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
  const [kategori, setKategori] = useState<KategoriBarang[]>([]);
  const [ruangan, setRuangan]   = useState<Ruangan[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [qrResult, setQrResult] = useState<{ qrCode: string; kode: string; nama: string } | null>(null);

  useEffect(() => {
    api.get<KategoriBarang[]>("/api/kategori").then(setKategori);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan);
  }, []);

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.kodeBarang || !form.nama || !form.kategoriId) {
      toast.error("Kode, nama, dan kategori wajib diisi"); return;
    }
    setSaving(true);
    try {
      const created = await api.post<Barang>("/api/barang", {
        ...form, jumlah: Number(form.jumlah) || 1,
        tahunBeli: form.tahunBeli ? Number(form.tahunBeli) : null,
        harga: form.harga ? Number(form.harga) : null,
        ruanganId: form.ruanganId || null,
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
            <input className="input" placeholder="BRG-001" value={form.kodeBarang} onChange={e => setF("kodeBarang", e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <select className="select" value={form.kondisi} onChange={e => setF("kondisi", e.target.value)}>
              <option value="BAIK">Baik</option><option value="RUSAK_RINGAN">Rusak Ringan</option><option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Nama Barang *</label><input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} /></div>
        <div className="form-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Kategori *</label><select className="select" value={form.kategoriId} onChange={e => setF("kategoriId", e.target.value)}><option value="">— Pilih —</option>{kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Ruangan</label><select className="select" value={form.ruanganId} onChange={e => setF("ruanganId", e.target.value)}><option value="">Tidak ada</option>{ruangan.map(r => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}</select></div>
        </div>
        <div className="form-grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Jumlah</label><input type="number" className="input" min={1} value={form.jumlah} onChange={e => setF("jumlah", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tahun Beli</label><input type="number" className="input" placeholder="2024" value={form.tahunBeli} onChange={e => setF("tahunBeli", e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Harga (Rp)</label><input type="number" className="input" placeholder="0" value={form.harga} onChange={e => setF("harga", e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Deskripsi</label><input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={e => setF("deskripsi", e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <><i className="ti ti-plus" />Tambah & Generate QR</>}
          </button>
        </div>
      </div>

      {/* QR Result — print directly */}
      {qrResult && (
        <div className="glass" style={{ padding: 24, marginTop: 16, textAlign: "center" }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrResult.nama}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, fontFamily: "monospace" }}>{qrResult.kode}</div>
          <div style={{ display: "inline-block", background: "#fff", padding: 10, borderRadius: 12, marginBottom: 16 }}>
            <img src={qrResult.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <i className="ti ti-printer" /> Print Langsung
            </button>
            <a href={qrResult.qrCode} download={`${qrResult.kode}-qr.png`} className="btn btn-ghost btn-sm" style={{ display: "inline-flex" }}>
              <i className="ti ti-download" /> Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Import CSV/Excel ──
function ImportSection() {
  const [file, setFile]       = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState<{ imported: number; skipped: number; errors: string[]; total: number } | null>(null);

  async function handleImport() {
    if (!file) { toast.error("Pilih file terlebih dahulu"); return; }
    setImporting(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/barang/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal import");
      setResult(data);
      toast.success(`${data.imported} barang berhasil diimport`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal import");
    } finally { setImporting(false); }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading" style={{ marginBottom: 16 }}>
          <div className="scan-title">Import CSV / Excel</div>
          <div className="scan-sub">Bulk add barang. Kolom wajib: kodeBarang, nama. Opsional: kategori, ruangan, kondisi, jumlah, tahunBeli, harga</div>
        </div>

        <div className="form-group">
          <label className="form-label">Pilih File CSV</label>
          <input type="file" className="input" accept=".csv,.xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
        </div>

        {file && (
          <div className="alert alert-warn mb-16">
            <i className="ti ti-file" style={{ flexShrink: 0 }} />
            File: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        <button className="btn btn-primary" onClick={handleImport} disabled={importing || !file}>
          {importing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Mengimport…</> : <><i className="ti ti-upload" />Import Sekarang</>}
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="grid-3" style={{ marginBottom: 12 }}>
              <div className="glass summary-badge-row"><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Baris</span><span className="badge badge-info">{result.total}</span></div>
              <div className="glass summary-badge-row"><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Berhasil</span><span className="badge badge-ok">{result.imported}</span></div>
              <div className="glass summary-badge-row"><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Skipped</span><span className="badge badge-warn">{result.skipped}</span></div>
            </div>
            {result.errors.length > 0 && (
              <div className="alert alert-danger">
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
                <div>
                  <strong>{result.errors.length} error:</strong>
                  {result.errors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 11, marginTop: 2 }}>{e}</div>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Kategori CRUD
// ══════════════════════════════════════════════════════════════════════════════
function KategoriTab() {
  const [list, setList]         = useState<KategoriBarang[]>([]);
  const [modal, setModal]       = useState(false);
  const [selected, setSelected] = useState<KategoriBarang | null>(null);
  const [form, setForm]         = useState({ nama: "", deskripsi: "" });
  const [saving, setSaving]     = useState(false);

  const load = () => api.get<KategoriBarang[]>("/api/kategori").then(setList).catch(console.error);
  useEffect(() => { load(); }, []);

  function openAdd()  { setSelected(null); setForm({ nama: "", deskripsi: "" }); setModal(true); }
  function openEdit(k: KategoriBarang) { setSelected(k); setForm({ nama: k.nama, deskripsi: k.deskripsi ?? "" }); setModal(true); }

  async function handleSave() {
    if (!form.nama) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      if (selected) { await api.put(`/api/kategori/${selected.id}`, form); toast.success("Kategori diperbarui"); }
      else { await api.post("/api/kategori", form); toast.success("Kategori ditambahkan"); }
      setModal(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus kategori "${nama}"?`)) return;
    try { await api.delete(`/api/kategori/${id}`); toast.success("Dihapus"); load(); }
    catch { toast.error("Gagal — mungkin masih ada barang di kategori ini"); }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openAdd}><i className="ti ti-plus" /> Tambah Kategori</button>
      </div>
      <div className="glass">
        <table className="table">
          <thead><tr><th>#</th><th>Nama Kategori</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><i className="ti ti-category-minus" style={{ fontSize: 28 }} />Belum ada kategori</div></td></tr>
            ) : list.map((k, i) => (
              <tr key={k.id}>
                <td className="td-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td className="td-name">{k.nama}</td>
                <td>{k.deskripsi ?? "—"}</td>
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
      <Modal open={modal} onClose={() => setModal(false)} title={selected ? "Edit Kategori" : "Tambah Kategori"}>
        <div className="form-group"><label className="form-label">Nama Kategori *</label><input className="input" placeholder="Komputer…" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Deskripsi</label><input className="input" placeholder="Keterangan opsional" value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <><div className="spinner" />Menyimpan…</> : "Simpan"}</button>
        </div>
      </Modal>
    </>
  );
}