// app/admin/barcode/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang, KategoriBarang, Ruangan } from "@/types";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

type Tab = "generate" | "scan";

const EMPTY_FORM = {
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

/** Badge + action logic berdasarkan hasSticker & qrCode */
function getStickerStatus(b: Barang) {
  if (b.hasSticker && b.qrCode)  return { badge: "badge-ok",   label: "Sticker + QR Digital", action: "Lihat QR" };
  if (b.hasSticker && !b.qrCode) return { badge: "badge-ok",   label: "Sticker Fisik",         action: "Generate QR Digital" };
  if (!b.hasSticker && b.qrCode) return { badge: "badge-ok",   label: "QR Digital",            action: "Lihat QR" };
  return                                { badge: "badge-warn",  label: "Belum Ada",             action: "Generate QR" };
}

export default function BarcodePage() {
  const [tab, setTab] = useState<Tab>("generate");
  return (
    <>
      <PageHeader title="Barcode / QR Code" subtitle="Generate & scan QR code aset FTI UKSW" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["generate", "scan"] as Tab[]).map(t => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t)}
          >
            <i className={`ti ${t === "generate" ? "ti-qrcode" : "ti-camera"}`} />
            {t === "generate" ? "Generate QR" : "Scan & Register"}
          </button>
        ))}
      </div>
      {tab === "generate" ? <GenerateTab /> : <ScanTab />}
    </>
  );
}

// ── Tab Generate ──────────────────────────────────────────────────────────────
function GenerateTab() {
  const [barang,    setBarang]    = useState<Barang[]>([]);
  const [search,    setSearch]    = useState("");
  const [qrModal,   setQrModal]   = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Barang[]>(`/api/barang?search=${encodeURIComponent(search)}`)
      .then(setBarang).catch(console.error);
  }, [search]);

  async function handleGenerate(b: Barang) {
    setLoadingId(b.id);
    try {
      const data = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${b.id}/qr`);
      setQrModal(data);
      // refresh list supaya badge update
      api.get<Barang[]>(`/api/barang?search=${encodeURIComponent(search)}`).then(setBarang);
    } catch { toast.error("Gagal generate QR"); }
    finally { setLoadingId(null); }
  }

  return (
    <>
      <div className="glass filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }} />
          <input
            className="input" style={{ paddingLeft: 36 }}
            placeholder="Cari nama atau kode barang…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Kode</th>
                <th style={{ width: "30%" }}>Nama</th>
                <th style={{ width: "14%" }}>Kategori</th>
                <th style={{ width: "20%" }}>Status QR</th>
                <th style={{ width: "20%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <i className="ti ti-box-off" style={{ fontSize: 28 }} />Tidak ada data
                  </div>
                </td></tr>
              ) : barang.map(b => {
                const s = getStickerStatus(b);
                return (
                  <tr key={b.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{b.kodeBarang}</td>
                    <td><div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div></td>
                    <td style={{ fontSize: 12 }}>{b.kategori.nama}</td>
                    <td>
                      <span className={`badge ${s.badge}`} style={{ fontSize: 11 }}>
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleGenerate(b)}
                        disabled={loadingId === b.id}
                      >
                        {loadingId === b.id
                          ? <div className="spinner" style={{ width: 13, height: 13 }} />
                          : <i className="ti ti-qrcode" />}
                        {s.action}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="QR Code Barang">
        {qrModal && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrModal.nama}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, fontFamily: "monospace" }}>{qrModal.kode}</div>
            <div style={{ display: "inline-block", background: "#fff", padding: 10, borderRadius: 12, marginBottom: 20 }}>
              <img src={qrModal.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <a href={qrModal.qrCode} download={`${qrModal.kode}-qr.png`} className="btn btn-primary btn-sm" style={{ display: "inline-flex" }}>
                <i className="ti ti-download" />Download PNG
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                <i className="ti ti-printer" />Print
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── Tab Scan & Register ───────────────────────────────────────────────────────
function ScanTab() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const jsqrReady = useRef(false);

  const [scanning,      setScanning]      = useState(false);
  const [scannedKode,   setScannedKode]   = useState("");
  const [foundBarang,   setFoundBarang]   = useState<Barang | null>(null);
  const [qrModal,       setQrModal]       = useState<{ qrCode: string; kode: string; nama: string } | null>(null);
  const [registerModal, setRegisterModal] = useState(false);
  const [form,          setForm]          = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [kategori,      setKategori]      = useState<KategoriBarang[]>([]);
  const [ruangan,       setRuangan]       = useState<Ruangan[]>([]);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    api.get<KategoriBarang[]>("/api/kategori").then(setKategori).catch(console.error);
    api.get<Ruangan[]>("/api/ruangan").then(setRuangan).catch(console.error);
  }, []);

  useEffect(() => {
    if (document.getElementById("jsqr-script")) { jsqrReady.current = true; return; }
    const s = document.createElement("script");
    s.id  = "jsqr-script";
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setScannedKode(""); setFoundBarang(null); setQrModal(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream; await v.play();
      setScanning(true); scanLoop();
    } catch {
      toast.error("Tidak dapat mengakses kamera. Pastikan izin diberikan.");
    }
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
    if (!jsqrReady.current || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop); return;
    }
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
    setFoundBarang(null); setQrModal(null);
    try {
      // Barang ditemukan → tampil info + QR digital (generate/refresh)
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      setFoundBarang(data);
      const qr = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${data.id}/qr`);
      setQrModal(qr);
    } catch {
      // 404 → belum di DB → form register, hasSticker: true otomatis
      setForm({ ...EMPTY_FORM, kodeBarang: kode });
      setRegisterModal(true);
    }
  }

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleRegister() {
    if (!form.nama.trim()) { toast.error("Nama barang wajib diisi"); return; }
    if (!form.kategoriId)  { toast.error("Kategori wajib dipilih"); return; }
    setSaving(true);
    try {
      await api.post("/api/barang", {
        ...form,
        jumlah:     Number(form.jumlah) || 1,
        tahunBeli:  form.tahunBeli ? Number(form.tahunBeli) : null,
        harga:      form.harga     ? Number(form.harga)     : null,
        ruanganId:  form.ruanganId || null,
        hasSticker: true,   // ← diregister via scan sticker fisik
      });
      toast.success(`Barang "${form.nama}" berhasil diregistrasi!`);
      setRegisterModal(false); setScannedKode(""); setForm(EMPTY_FORM);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal registrasi");
    } finally { setSaving(false); }
  }

  const reset = () => { setScannedKode(""); setFoundBarang(null); setQrModal(null); startCamera(); };

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Scan QR / Barcode Aset
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Sudah di DB → tampil info &nbsp;·&nbsp; Belum → form registrasi baru
          </div>
        </div>

        <div style={{
          position: "relative", width: "100%", aspectRatio: "4/3",
          borderRadius: 12, overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 16, transition: "border-color .3s",
        }}>
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
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" />Stop Kamera</button>
          }
          {scannedKode && !scanning && (
            <button className="btn btn-ghost" onClick={reset}><i className="ti ti-refresh" />Scan Ulang</button>
          )}
        </div>

        {scannedKode && !scanning && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(65,90,119,0.2)", border: "1px solid var(--glass-border)", fontSize: 12 }}>
            <span style={{ color: "var(--text-muted)" }}>Kode terbaca: </span>
            <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{scannedKode}</span>
          </div>
        )}
      </div>

      {/* ── Modal: ditemukan → info + QR digital ── */}
      <Modal open={!!qrModal} onClose={() => { setQrModal(null); setFoundBarang(null); }} title="Barang Ditemukan">
        {qrModal && foundBarang && (
          <div style={{ textAlign: "center" }}>
            {/* Status badges */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
              {foundBarang.hasSticker && (
                <span className="badge badge-ok"><i className="ti ti-scan" style={{ fontSize: 11 }} />Sticker Fisik</span>
              )}
              {foundBarang.qrCode && (
                <span className="badge badge-ok"><i className="ti ti-qrcode" style={{ fontSize: 11 }} />QR Digital</span>
              )}
              <span className={`badge ${foundBarang.status === "TERSEDIA" ? "badge-ok" : "badge-warn"}`}>
                {foundBarang.status}
              </span>
            </div>

            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{qrModal.nama}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, fontFamily: "monospace" }}>{qrModal.kode}</div>
            <div style={{ display: "inline-block", background: "#fff", padding: 10, borderRadius: 12, marginBottom: 20 }}>
              <img src={qrModal.qrCode} alt="QR" style={{ width: 200, height: 200, display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={qrModal.qrCode} download={`${qrModal.kode}-qr.png`} className="btn btn-primary btn-sm" style={{ display: "inline-flex" }}>
                <i className="ti ti-download" />Download PNG
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                <i className="ti ti-printer" />Print
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setQrModal(null); setFoundBarang(null); reset(); }}>
                <i className="ti ti-refresh" />Scan Lagi
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: tidak ditemukan → form register ── */}
      <Modal open={registerModal} onClose={() => { setRegisterModal(false); setForm(EMPTY_FORM); }} title="Register Barang Baru">
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
          Kode <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{scannedKode}</span> belum terdaftar. Lengkapi data untuk mendaftarkan barang ini.
        </div>

        {/* Kode read-only — dari sticker fisik */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kode Barang <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(dari sticker)</span></label>
            <input className="input" value={form.kodeBarang} readOnly style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kondisi</label>
            <select className="select" value={form.kondisi} onChange={e => setF("kondisi", e.target.value)}>
              <option value="BAIK">Baik</option>
              <option value="RUSAK_RINGAN">Rusak Ringan</option>
              <option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nama Barang *</label>
          <input className="input" placeholder="Nama barang" value={form.nama} onChange={e => setF("nama", e.target.value)} autoFocus />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
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

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={() => { setRegisterModal(false); setForm(EMPTY_FORM); }}>Batal</button>
          <button className="btn btn-primary" onClick={handleRegister} disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</>
              : <><i className="ti ti-plus" />Register Barang</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}