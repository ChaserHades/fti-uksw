// components/features/barang/ManualAddSection.tsx
"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { BARANG_FORM_EMPTY } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";
import type { Barang, JenisBarang, Letak } from "@/types";
import BarangFormFields from "./BarangFormFields";

/** Manual add section — fill form, auto-generate QR, print */
export default function ManualAddSection() {
  const [jenisBarang, setJenisBarang] = useState<JenisBarang[]>([]);
  const [letak, setLetak] = useState<Letak[]>([]);
  const [form, setForm] = useState<BarangFormData>(BARANG_FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [qrResult, setQrResult] = useState<{ qrCode: string; kode: string; nama: string } | null>(null);

  useEffect(() => {
    api.get<JenisBarang[]>("/api/jenis-barang").then(setJenisBarang);
    api.get<Letak[]>("/api/letak").then(setLetak);
  }, []);

  const handleFieldChange = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.label || !form.nama || !form.jenisBarangId) {
      toast.error("Label, nama, dan kategori wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<Barang>("/api/barang", {
        ...form,
        jumlah: Number(form.jumlah) || 1,
        tanggalDatang: form.tanggalDatang || null,
        tanggalPindah: form.tanggalPindah || null,
        harga: form.harga ? Number(form.harga) : null,
        letakId: form.letakId || null,
      });
      const qr = await api.get<{ qrCode: string; kode: string; nama: string }>(`/api/barang/${created.id}/qr`);
      setQrResult(qr);
      toast.success("Barang ditambahkan! QR Code siap di-print.");
      setForm(BARANG_FORM_EMPTY);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="glass" style={{ padding: 24 }}>
        <div className="scan-heading" style={{ marginBottom: 16 }}>
          <div className="scan-title">Input Manual Barang Baru</div>
          <div className="scan-sub">Barang tanpa QR → auto-generate QR → langsung Print</div>
        </div>

        <BarangFormFields
          form={form}
          onChange={handleFieldChange}
          jenisBarang={jenisBarang}
          letak={letak}
        />

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: 14, height: 14 }} />Menyimpan…</>
              : <><i className="ti ti-plus" />Tambah & Generate QR</>}
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
