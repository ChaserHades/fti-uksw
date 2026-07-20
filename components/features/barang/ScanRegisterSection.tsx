// components/features/barang/ScanRegisterSection.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { parseQrPayload } from "@/helpers/format";
import { useQrScanner } from "@/hooks/useQrScanner";
import { BARANG_FORM_EMPTY } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";
import type { Barang } from "@/types";
import BarangFormFields from "./BarangFormFields";

/** Scan QR → lookup DB → register if not found */
export default function ScanRegisterSection() {
  const [scannedKode, setScannedKode] = useState("");
  const [foundBarang, setFoundBarang] = useState<Barang | null>(null);
  const [registerModal, setRegisterModal] = useState(false);
  const [form, setForm] = useState<BarangFormData>(BARANG_FORM_EMPTY);
  const [saving, setSaving] = useState(false);

  async function handleScanResult(raw: string) {
    const kode = parseQrPayload(raw);
    setScannedKode(kode);
    try {
      const data = await api.get<Barang>(`/api/barang?kode=${encodeURIComponent(kode)}`);
      setFoundBarang(data);
      toast.success(`Barang "${data.nama}" sudah terdaftar di database`);
    } catch {
      setForm({ ...BARANG_FORM_EMPTY, label: kode });
      setRegisterModal(true);
    }
  }

  const { videoRef, canvasRef, scanning, startCamera, stopCamera } = useQrScanner(handleScanResult);

  const handleFieldChange = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  async function handleRegister() {
    if (!form.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!form.kategori) { toast.error("Jenis barang wajib dipilih"); return; }
    setSaving(true);
    try {
      await api.post("/api/barang", {
        ...form,
        jumlah: Number(form.jumlah) || 1,
        tanggalDatang: form.tanggalDatang || null,
        tanggalPindah: form.tanggalPindah || null,
        harga: form.harga ? Number(form.harga) : null,
        ruanganId: form.ruangan || null,
        kategoriId: form.kategori,
        hasSticker: true,
      });
      toast.success(`Barang "${form.nama}" berhasil diregistrasi!`);
      setRegisterModal(false);
      setScannedKode("");
      setForm(BARANG_FORM_EMPTY);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal registrasi");
    } finally {
      setSaving(false);
    }
  }

  const handleStartCamera = async () => {
    setScannedKode("");
    setFoundBarang(null);
    try {
      await startCamera();
    } catch {
      toast.error("Tidak dapat mengakses kamera");
    }
  };

  return (
    <div className="scan-container">
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading">
          <div className="scan-title">Scan QR / Barcode Aset</div>
        </div>

        {/* Camera viewport */}
        <div style={{
          position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 12,
          overflow: "hidden", background: "#000",
          border: `2px solid ${scanning ? "var(--color-ok)" : "var(--glass-border)"}`,
          marginBottom: 16,
        }}>
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

        {/* Camera controls */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!scanning
            ? <button className="btn btn-primary" onClick={handleStartCamera}><i className="ti ti-camera" /> Buka Kamera</button>
            : <button className="btn btn-ghost" onClick={stopCamera}><i className="ti ti-camera-off" /> Stop Kamera</button>}
          {scannedKode && !scanning && (
            <button className="btn btn-ghost" onClick={() => { setScannedKode(""); setFoundBarang(null); handleStartCamera(); }}>
              <i className="ti ti-refresh" /> Scan Ulang
            </button>
          )}
        </div>

        {/* Found result */}
        {scannedKode && !scanning && foundBarang && (
          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <i className="ti ti-check" /> Barang <strong>{foundBarang.nama}</strong> ({foundBarang.label}) sudah terdaftar.
          </div>
        )}
      </div>

      {/* Register Modal */}
      <Modal open={registerModal} onClose={() => { setRegisterModal(false); setForm(BARANG_FORM_EMPTY); }} title="Register Barang Baru">
        <div className="alert alert-warn mb-16">
          <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
          Kode <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{scannedKode}</span> belum terdaftar.
        </div>

        <BarangFormFields
          form={form}
          onChange={handleFieldChange}
          readOnlyLabel
          compact
        />

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => { setRegisterModal(false); setForm(BARANG_FORM_EMPTY); }}>Batal</button>
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
