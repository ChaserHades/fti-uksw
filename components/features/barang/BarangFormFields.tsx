// components/features/barang/BarangFormFields.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import AsyncAutocomplete from "@/components/AsyncAutocomplete";
import LiquidSelect from "@/components/LiquidSelect";
import { terbilang } from "@/helpers/format";
import { KONDISI_OPTIONS, PROGDI_OPTIONS } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";

interface BarangFormFieldsProps {
  form: BarangFormData;
  onChange: (key: string, value: unknown) => void;
  /** If true, the label/kode field is read-only (e.g. from QR scan — recovery mode) */
  readOnlyLabel?: boolean;
  /** If true, show fewer fields (register modal from scan) */
  compact?: boolean;
}

/** Generate kode label from kategori name, merek, date and purchase order */
function generateKode(kategoriNama: string, merek: string, tanggal: string, pembelianKe: string | number): string {
  if (!kategoriNama || !merek || !tanggal) return "";

  // Take first 3 chars (or all if < 3) uppercase, remove spaces
  const katPart = kategoriNama.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const merkPart = merek.replace(/\s+/g, "").slice(0, 3).toUpperCase();

  // Parse month+year from date string "YYYY-MM-DD"
  const dateObj = new Date(tanggal);
  if (isNaN(dateObj.getTime())) return "";
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();

  // Purchase sequence, zero-padded to 3 digits
  const seq = String(Number(pembelianKe) || 1).padStart(3, "0");

  return `${katPart}-${merkPart}-${mm}${yyyy}-${seq}`;
}

/**
 * Shared form fields for creating/editing a Barang.
 * Used in DaftarBarangTab (edit modal), ScanRegisterSection (register modal),
 * and ManualAddSection (add form).
 *
 * Priority order per revisi: Nama Barang → Kategori → Merek → Tanggal Datang → Pembelian ke-?
 * Label is auto-generated (read-only preview). Label Aset is from Universitas (optional).
 */
export default function BarangFormFields({
  form,
  onChange,
  readOnlyLabel = false,
  compact = false,
}: BarangFormFieldsProps) {
  // Store selected kategori name for label generation
  const [kategoriNama, setKategoriNama] = useState("");
  const [isFetchingPembelianKe, setIsFetchingPembelianKe] = useState(false);

  // Auto-generated preview kode
  const previewKode = generateKode(kategoriNama, form.merek, form.tanggalDatang, form.pembelianKe);

  // Sync generated label into form so it gets saved to DB
  useEffect(() => {
    if (!readOnlyLabel && previewKode) {
      onChange("label", previewKode);
    }
  }, [previewKode, readOnlyLabel]);

  // Fetch next pembelianKe when tanggalDatang changes
  const fetchPembelianKe = useCallback(async (tanggal: string) => {
    if (!tanggal) return;
    const dateObj = new Date(tanggal);
    if (isNaN(dateObj.getTime())) return;

    const bulan = String(dateObj.getMonth() + 1).padStart(2, "0");
    const tahun = String(dateObj.getFullYear());

    setIsFetchingPembelianKe(true);
    try {
      const res = await fetch(`/api/barang/pembelian-ke?bulan=${bulan}&tahun=${tahun}`);
      if (res.ok) {
        const data = await res.json();
        onChange("pembelianKe", data.pembelianKe);
      }
    } catch {
      // Silently fail — user can still set manually
    } finally {
      setIsFetchingPembelianKe(false);
    }
  }, [onChange]);

  const handleTanggalChange = (val: string) => {
    onChange("tanggalDatang", val);
    fetchPembelianKe(val);
  };

  return (
    <>
      {/* ── Row 1 (Priority): Nama Barang ── */}
      <div className="form-group">
        <label className="form-label">Nama Barang *</label>
        <input
          className="input"
          placeholder="MacBook Pro M3 16 inch"
          value={form.namaBarang}
          onChange={e => onChange("namaBarang", e.target.value)}
        />
      </div>

      {/* ── Row 2 (Priority): Kategori + Progdi ── */}
      <div className={compact ? "form-grid-2" : "form-grid-2"}>
        <div className="form-group">
          <label className="form-label">Kategori *</label>
          <AsyncAutocomplete
            value={form.kategori}
            onChange={val => onChange("kategori", val)}
            onSelect={opt => setKategoriNama(opt.label)}
            fetchUrl="/api/kategori"
            placeholder="Laptop"
            mapOption={item => ({ value: item.id, label: item.nama })}
          />
        </div>
        {!compact && (
          <div className="form-group">
            <label className="form-label">Program Studi (Progdi)</label>
            <LiquidSelect
              value={form.progdi}
              onChange={val => onChange("progdi", val)}
              options={[{ value: "", label: "— Pilih Progdi —" }, ...PROGDI_OPTIONS]}
            />
          </div>
        )}
      </div>

      {/* ── Row 3 (Priority): Merek + Tanggal Datang ── */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Merek *</label>
          <input
            className="input"
            placeholder="Apple, HP, Lenovo"
            value={form.merek}
            onChange={e => onChange("merek", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal Datang *</label>
          <input
            type="date"
            max="9999-12-31"
            className="input"
            value={form.tanggalDatang}
            onChange={e => handleTanggalChange(e.target.value)}
          />
        </div>
      </div>

      {/* ── Row 4 (Priority): Pembelian ke-? ── */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            Pembelian ke-?
            {isFetchingPembelianKe && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                <div className="spinner" style={{ width: 10, height: 10, display: "inline-block", verticalAlign: "middle" }} /> Mengecek…
              </span>
            )}
          </label>
          <input
            type="number"
            className="input"
            min={1}
            placeholder="1"
            value={form.pembelianKe === "" ? "" : Number(form.pembelianKe)}
            onChange={e => onChange("pembelianKe", e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Urutan pembelian dalam bulan/tahun yang dipilih (auto, bisa diubah)
          </div>
        </div>

        {/* Label Preview — read-only, auto-generated */}
        <div className="form-group">
          <label className="form-label">Kode Label (Auto)</label>
          <div
            className="input"
            style={{
              background: "var(--glass-bg)",
              opacity: previewKode ? 1 : 0.5,
              fontFamily: "monospace",
              letterSpacing: "1px",
              cursor: "default",
              userSelect: "all",
            }}
          >
            {previewKode || "— isi Kategori, Merek, dan Tanggal —"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Kode ini otomatis ter-generate dan disimpan sebagai label barang
          </div>
        </div>
      </div>

      {/* ── Label Aset (from Universitas, optional) ── */}
      {!compact && (
        <div className="form-group">
          <label className="form-label">Label Aset <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(dari Universitas, opsional)</span></label>
          <input className="input" placeholder="FTI-UKSW-2026-001" value={form.labelAset} onChange={e => onChange("labelAset", e.target.value)} />
        </div>
      )}

      {/* ── Kondisi ── */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Kondisi</label>
          <LiquidSelect
            value={form.kondisi}
            onChange={val => onChange("kondisi", val)}
            options={[...KONDISI_OPTIONS]}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Ruangan</label>
          <AsyncAutocomplete
            value={form.ruangan}
            onChange={val => onChange("ruangan", val)}
            fetchUrl="/api/ruangan"
            placeholder="GX 405"
            mapOption={item => ({ value: item.id, label: item.kode })}
          />
        </div>
      </div>

      {/* ── Model + Tipe (skip model in compact) ── */}
      {compact ? (
        <div className="form-group">
          <label className="form-label">Tipe</label>
          <input className="input" placeholder="Gen 2" value={form.tipe} onChange={e => onChange("tipe", e.target.value)} />
        </div>
      ) : (
        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Model</label>
            <input className="input" placeholder="ThinkPad L14" value={form.model} onChange={e => onChange("model", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipe</label>
            <input className="input" placeholder="Gen 2" value={form.tipe} onChange={e => onChange("tipe", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="PF3Q..." value={form.sn} onChange={e => onChange("sn", e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Vendor / SN (compact) ── */}
      {compact && (
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="PF3Q..." value={form.sn} onChange={e => onChange("sn", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vendor / Supplier</label>
            <input className="input" placeholder="CV. Komputer" value={form.vendor} onChange={e => onChange("vendor", e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Harga / Sumber Tahun / Tgl Pindah (full mode only) ── */}
      {!compact && (
        <>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Vendor / Supplier</label>
              <input className="input" placeholder="CV. Komputer" value={form.vendor} onChange={e => onChange("vendor", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tgl Pindah</label>
              <input type="date" max="9999-12-31" className="input" value={form.tanggalPindah} onChange={e => onChange("tanggalPindah", e.target.value)} />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Harga (Rp)</label>
              <input
                type="text"
                className="input"
                placeholder="0"
                value={form.harga ? Number(form.harga).toLocaleString("id-ID") : ""}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  onChange("harga", raw);
                }}
              />
              {form.harga && !isNaN(Number(form.harga)) && Number(form.harga) > 0 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                  {terbilang(Number(form.harga))} Rupiah
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Sumber/Tahun</label>
              <input className="input" placeholder="Hibah Dikti 2026" value={form.sumberTahun} onChange={e => onChange("sumberTahun", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Jumlah</label>
              <input
                type="text"
                className="input"
                value={form.jumlah ? Number(form.jumlah).toLocaleString("id-ID") : ""}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  onChange("jumlah", raw);
                }}
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="form-group">
            <label className="form-label">Keterangan</label>
            <input className="input" placeholder="Pembelian dana hibah lab" value={form.keterangan} onChange={e => onChange("keterangan", e.target.value)} />
          </div>
        </>
      )}
    </>
  );
}
