// app/petugas/pinjam/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import type { Barang, Transaksi } from "@/types";
import { Mode } from "fs";

declare const jsQR: (
  data: Uint8ClampedArray, width: number, height: number
) => { data: string } | null;

interface PinjamForm {
  namaPeminjam:    string;
  ruanganPinjam:   string;
  deadlineKembali: string;
  catatan:         string;
}
const EMPTY: PinjamForm = { namaPeminjam: "", ruanganPinjam: "", deadlineKembali: "", catatan: "" };

/** QR payload bisa berupa JSON object {"id","kode","nama"} atau plain kodeBarang */
function parseQrPayload(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.kode && typeof parsed.kode === "string") return parsed.kode;
  } catch { /* plain string */ }
  return trimmed;
}

export default function PinjamPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const jsqrReady = useRef(false);

  const [scanning,  setScanning]  = useState(false);
  const [barang,    setBarang]    = useState<Barang | null>(null);
  const [lookErr,   setLookErr]   = useState("");

  // Modal pinjam (barang TERSEDIA)
  const [modalPinjam, setModalPinjam] = useState(false);
  const [form,        setForm]        = useState<PinjamForm>(EMPTY);
  const [saving,      setSaving]      = useState(false);

  // Modal auto-return konfirmasi (barang DIPINJAM)
  const [modalKembali,  setModalKembali]  = useState(false);
  const [transaksiAktif, setTransaksiAktif] = useState<Transaksi | null>(null);
  const [processing,    setProcessing]    = useState(false);

  const minDate    = new Date(); minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  // Load jsQR
  useEffect(() => {
    if (document.getElementById("jsqr-script")) { jsqrReady.current = true; return; }
    const s = document.createElement("script");
    s.id = "jsqr-script";
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => { jsqrReady.current = true; };
    document.head.appendChild(s);
  }, []);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setLookErr(""); setBarang(null);
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
    setLookErr(""); setBarang(null);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      setBarang(data);

      if (data.status === "TERSEDIA") {
        // → form pinjam
        setForm(EMPTY); setModalPinjam(true);
      } else if (data.status === "DIPINJAM") {
        // → cari transaksi aktif lalu tampil modal konfirmasi kembali
        const list = await api.get<Transaksi[]>("/api/transaksi?status=AKTIF");
        const trx  = list.find(t => t.barangId === data.id);
        if (!trx) {
          setLookErr(`Barang "${data.nama}" berstatus DIPINJAM tapi transaksi aktif tidak ditemukan.`);
          return;
        }
        setTransaksiAktif(trx); setModalKembali(true);
      } else {
        setLookErr(`Barang "${data.nama}" berstatus ${data.status} — tidak dapat diproses.`);
      }
    } catch {
      setLookErr(`Barang kode "${kode}" tidak ditemukan. Hubungi Admin untuk registrasi.`);
    }
  }

  const setF = (k: keyof PinjamForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Submit pinjam ──
  async function handlePinjam() {
    if (!barang) return;
    if (!form.namaPeminjam.trim())  { toast.error("Nama peminjam wajib diisi"); return; }
    if (!form.ruanganPinjam.trim()) { toast.error("Ruangan wajib diisi"); return; }
    if (!form.deadlineKembali)      { toast.error("Deadline wajib diisi"); return; }
    setSaving(true);
    try {
      await api.post("/api/transaksi", {
        barangId:        barang.id,
        namaPeminjam:    form.namaPeminjam,
        ruanganPinjam:   form.ruanganPinjam,
        deadlineKembali: form.deadlineKembali,
        catatan:         form.catatan,
      });
      toast.success(`Peminjaman "${barang.nama}" berhasil dicatat!`);
      setModalPinjam(false); setBarang(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal meminjam");
    } finally { setSaving(false); }
  }

  // ── Auto return ──
  async function handleKembali() {
    if (!transaksiAktif) return;
    setProcessing(true);
    try {
      await api.post(`/api/transaksi/${transaksiAktif.id}/kembali`, {});
      toast.success("Barang berhasil dikembalikan — status kembali Tersedia!");
      setModalKembali(false); setTransaksiAktif(null); setBarang(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses pengembalian");
    } finally { setProcessing(false); }
  }

  return (
    <>
      <PageHeader title="Pinjam / Kembali Barang" subtitle="Scan QR Code barang — sistem mendeteksi status otomatis" />

      <div style={{ maxWidth: 520 }}>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Scan QR Code Barang
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
                <i className="ti ti-qrcode" style={{ fontSize: 40, color: "var(--text-muted)" }} />
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
          </div>

          {lookErr && (
            <div className="alert alert-danger" style={{ marginTop: 14 }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{lookErr}</span>
              <button className="btn btn-ghost btn-sm" onClick={startCamera}>Scan Ulang</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: TERSEDIA → Form Pinjam ── */}
      <Modal open={modalPinjam} onClose={() => { setModalPinjam(false); setBarang(null); }} title="Form Peminjaman">
        {barang && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 20, background: "rgba(65,90,119,0.25)", border: "1px solid var(--glass-border)", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(65,90,119,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-box" style={{ fontSize: 20, color: "var(--ds-mist)" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{barang.nama}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{barang.kodeBarang}</div>
              </div>
              <span className="badge badge-ok" style={{ flexShrink: 0 }}>Tersedia</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Peminjam *</label>
              <input className="input" placeholder="Nama mahasiswa / dosen / staf" value={form.namaPeminjam} onChange={e => setF("namaPeminjam", e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Ruangan yang Digunakan *</label>
              <input className="input" placeholder="Contoh: FTI-310, Lab Jaringan" value={form.ruanganPinjam} onChange={e => setF("ruanganPinjam", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline Pengembalian *</label>
              <input type="date" className="input" min={minDateStr} value={form.deadlineKembali} onChange={e => setF("deadlineKembali", e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Catatan (opsional)</label>
              <input className="input" placeholder="Keperluan / keterangan" value={form.catatan} onChange={e => setF("catatan", e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => { setModalPinjam(false); setBarang(null); }}>Batal</button>
              <button className="btn btn-primary" onClick={handlePinjam} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-check" />Konfirmasi Pinjam</>}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal: DIPINJAM → Konfirmasi Kembali ── */}
      <Modal open={modalKembali} onClose={() => { setModalKembali(false); setTransaksiAktif(null); setBarang(null); }} title="Konfirmasi Pengembalian">
        {barang && transaksiAktif && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(65,90,119,0.25)", border: "1px solid var(--glass-border)" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{barang.nama}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { label: "Kode",     value: barang.kodeBarang },
                  { label: "Peminjam", value: transaksiAktif.namaPeminjam },
                  { label: "Ruangan",  value: transaksiAktif.ruanganPinjam },
                  { label: "Deadline", value: new Date(transaksiAktif.deadlineKembali).toLocaleDateString("id-ID") },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted)", width: 70, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ color: "var(--text-secondary)", fontFamily: row.label === "Kode" ? "monospace" : undefined }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Konfirmasi bahwa barang telah dikembalikan. Status akan otomatis berubah menjadi <strong>Tersedia</strong>.
            </div>

            {/* ── Mode switcher ── */}
            {/* <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["scan", "list"] as Mode[]).map(m => (
                <button
                  key={m}
                  className={`btn btn-sm ${mode === m ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setMode(m)}
                >
                  <i className={`ti ${m === "scan" ? "ti-qrcode" : "ti-list"}`} />
                  {m === "scan" ? "Scan QR" : "Lihat Daftar"}
                </button>
              ))}
            </div> */}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => { setModalKembali(false); setTransaksiAktif(null); setBarang(null); }}>Batal</button>
              <button className="btn btn-success" onClick={handleKembali} disabled={processing}>
                {processing ? <><div className="spinner" style={{ width: 14, height: 14 }} />Memproses…</> : <><i className="ti ti-circle-check" />Konfirmasi Kembali</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}