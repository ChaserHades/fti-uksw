// app/admin/barcode/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang } from "@/types";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

type Tab = "generate" | "scan";

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

// ── Tab Generate ─────────────────────────────────────────
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
                <th style={{ width: "18%" }}>Kode</th>
                <th style={{ width: "38%" }}>Nama</th>
                <th style={{ width: "18%" }}>Kategori</th>
                <th style={{ width: "10%" }}>QR</th>
                <th style={{ width: "16%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <i className="ti ti-box-off" style={{ fontSize: 28 }} />Tidak ada data
                  </div>
                </td></tr>
              ) : barang.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{b.kodeBarang}</td>
                  <td><div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.nama}</div></td>
                  <td style={{ fontSize: 12 }}>{b.kategori.nama}</td>
                  <td>
                    {b.qrCode
                      ? <span className="badge badge-ok"><i className="ti ti-check" style={{ fontSize: 10 }} />Ada</span>
                      : <span className="badge badge-warn">Belum</span>
                    }
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleGenerate(b)} disabled={loadingId === b.id}>
                      {loadingId === b.id ? <div className="spinner" style={{ width: 13, height: 13 }} /> : <i className="ti ti-qrcode" />}
                      {b.qrCode ? "Lihat QR" : "Generate"}
                    </button>
                  </td>
                </tr>
              ))}
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

// ── Tab Scan & Register
function ScanTab() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const jsqrReady  = useRef(false);

  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState("");
  const [barang,    setBarang]    = useState<Barang | null>(null);
  const [lookErr,   setLookErr]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Load jsQR dari CDN
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setScanning(true);
      scanLoop();
    } catch {
      toast.error("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
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
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!jsqrReady.current || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop); return;
    }
    const ctx = canvas.getContext("2d")!;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, canvas.width, canvas.height);
    if (code?.data) {
      stopCamera();
      handleScanResult(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  async function handleScanResult(kode: string) {
    setResult(kode); setLookErr(""); setBarang(null);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      setBarang(data); setModalOpen(true);
    } catch {
      setLookErr(`Barang kode "${kode}" tidak ditemukan di database.`);
    }
  }

  async function handleRegister() {
    if (!barang) return;
    setSaving(true);
    try {
      await api.post(`/api/barang/${barang.id}/qr-register`, { kode: result });
      toast.success(`QR "${barang.nama}" berhasil diregistrasi!`);
      setModalOpen(false); setResult(""); setBarang(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal registrasi");
    } finally { setSaving(false); }
  }

  const reset = () => { setResult(""); setLookErr(""); setBarang(null); startCamera(); };

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Scan QR Code untuk Register ke Database
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Scan QR fisik yang sudah dicetak — sistem mencatat ke record barang
          </div>
        </div>

        {/* Viewfinder */}
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
          {/* Scan overlay */}
          {scanning && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{
                width: 180, height: 180, borderRadius: 10,
                border: "2px solid var(--color-ok)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
              }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!scanning
            ? <button className="btn btn-primary" onClick={startCamera}><i className="ti ti-camera" />Buka Kamera</button>
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" />Stop Kamera</button>
          }
        </div>

        {lookErr && (
          <div className="alert alert-danger" style={{ marginTop: 14 }}>
            <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{lookErr}</span>
            <button className="btn btn-ghost btn-sm" onClick={reset}>Scan Ulang</button>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setResult(""); setBarang(null); }} title="Registrasi QR Code">
        {barang && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(65,90,119,0.25)", border: "1px solid var(--glass-border)" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{barang.nama}</div>
              {[["Kode", barang.kodeBarang], ["Kategori", barang.kategori.nama], ["Status QR", barang.qrCode ? "Sudah terdaftar" : "Belum terdaftar"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-muted)", width: 75, flexShrink: 0 }}>{l}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{v}</span>
                </div>
              ))}
            </div>
            {barang.qrCode
              ? <div className="alert alert-warn" style={{ marginBottom: 16 }}><i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />QR sudah terdaftar. Scan ini akan menimpa data lama.</div>
              : <div className="alert alert-info" style={{ marginBottom: 16 }}><i className="ti ti-info-circle" style={{ flexShrink: 0 }} />QR akan diregistrasikan ke database untuk barang ini.</div>
            }
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => { setModalOpen(false); setResult(""); setBarang(null); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</> : <><i className="ti ti-check" />Registrasi QR</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}