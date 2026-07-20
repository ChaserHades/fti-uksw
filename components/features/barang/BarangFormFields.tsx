// components/features/barang/BarangFormFields.tsx
"use client";
import AsyncAutocomplete from "@/components/AsyncAutocomplete";
import LiquidSelect from "@/components/LiquidSelect";
import { terbilang } from "@/helpers/format";
import { KONDISI_OPTIONS } from "@/constants/barang";
import type { BarangFormData } from "@/constants/barang";
import type { Kategori, Ruangan } from "@/types";

interface BarangFormFieldsProps {
  form: BarangFormData;
  onChange: (key: string, value: unknown) => void;
  /** If true, the label/kode field is read-only (e.g. from QR scan) */
  readOnlyLabel?: boolean;
  /** If true, show fewer fields (register modal from scan) */
  compact?: boolean;
}

/**
 * Shared form fields for creating/editing a Barang.
 * Used in DaftarBarangTab (edit modal), ScanRegisterSection (register modal),
 * and ManualAddSection (add form).
 */
export default function BarangFormFields({
  form,
  onChange,
  readOnlyLabel = false,
  compact = false,
}: BarangFormFieldsProps) {
  return (
    <>
      {/* Row 1: Kode / Label Aset / SN */}
      <div className={compact ? "form-grid-2" : "form-grid-3"}>
        <div className="form-group">
          <label className="form-label">
            Kode Barang (Label) {readOnlyLabel && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(dari sticker)</span>}
          </label>
          <input
            className="input"
            placeholder="BRG-001"
            value={form.label}
            onChange={e => onChange("label", e.target.value)}
            readOnly={readOnlyLabel}
            style={readOnlyLabel ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          />
        </div>
        {!compact && (
          <div className="form-group">
            <label className="form-label">Label Aset</label>
            <input className="input" placeholder="LBL-AST-01" value={form.labelAset} onChange={e => onChange("labelAset", e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Kondisi</label>
          <LiquidSelect
            value={form.kondisi}
            onChange={val => onChange("kondisi", val)}
            options={[...KONDISI_OPTIONS]}
          />
        </div>
      </div>

      {/* Nama Barang */}
      <div className="form-group">
        <label className="form-label">Nama Barang *</label>
        <input className="input" placeholder="Nama barang" value={form.nama} onChange={e => onChange("nama", e.target.value)} />
      </div>

      {/* Merek / Model / Tipe — skip model in compact */}
      {compact ? (
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Merek</label>
            <input className="input" placeholder="Merek barang" value={form.merek} onChange={e => onChange("merek", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipe</label>
            <input className="input" placeholder="Model / Tipe" value={form.tipe} onChange={e => onChange("tipe", e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Merek</label>
            <input className="input" placeholder="Merek barang" value={form.merek} onChange={e => onChange("merek", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <input className="input" placeholder="Model barang" value={form.model} onChange={e => onChange("model", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipe</label>
            <input className="input" placeholder="Tipe barang" value={form.tipe} onChange={e => onChange("tipe", e.target.value)} />
          </div>
        </div>
      )}

      {/* Vendor / SN (compact) or Vendor / Kondisi (full) */}
      {compact ? (
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="S/N" value={form.sn} onChange={e => onChange("sn", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vendor / Supplier</label>
            <input className="input" placeholder="Nama vendor" value={form.vendor} onChange={e => onChange("vendor", e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Vendor / Supplier</label>
            <input className="input" placeholder="Nama vendor" value={form.vendor} onChange={e => onChange("vendor", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Serial Number (SN)</label>
            <input className="input" placeholder="S/N" value={form.sn} onChange={e => onChange("sn", e.target.value)} />
          </div>
        </div>
      )}

      {/* Kategori / Ruangan */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Kategori *</label>
          <AsyncAutocomplete
            value={form.kategori}
            onChange={val => onChange("kategori", val)}
            fetchUrl="/api/kategori"
            placeholder="Ketik atau pilih kategori..."
            mapOption={item => ({ value: item.id, label: item.nama })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Ruangan</label>
          <AsyncAutocomplete
            value={form.ruangan}
            onChange={val => onChange("ruangan", val)}
            fetchUrl="/api/ruangan"
            placeholder="Ketik kode ruangan..."
            mapOption={item => ({ value: item.id, label: item.kode })}
          />
        </div>
      </div>

      {/* Jumlah / Dates / Harga */}
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Jumlah</label>
          <input type="number" className="input" min={1} value={form.jumlah} onChange={e => onChange("jumlah", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Tgl Datang</label>
          <input type="date" max="9999-12-31" className="input" value={form.tanggalDatang} onChange={e => onChange("tanggalDatang", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Tgl Pindah</label>
          <input type="date" max="9999-12-31" className="input" value={form.tanggalPindah} onChange={e => onChange("tanggalPindah", e.target.value)} />
        </div>
      </div>

      {/* Harga / SumberTahun / Status */}
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Harga (Rp)</label>
          <input type="number" className="input" placeholder="0" value={form.harga} onChange={e => onChange("harga", e.target.value)} />
          {form.harga && !isNaN(Number(form.harga)) && Number(form.harga) > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
              {terbilang(Number(form.harga))} Rupiah
            </div>
          )}
        </div>
        {!compact && (
          <div className="form-group">
            <label className="form-label">Sumber/Tahun</label>
            <input className="input" placeholder="Contoh: BOS 2023" value={form.sumberTahun} onChange={e => onChange("sumberTahun", e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Status</label>
          <LiquidSelect
            value={form.status}
            onChange={val => onChange("status", val)}
            options={[
              { value: "TERSEDIA", label: "Tersedia" },
              { value: "DIPINJAM", label: "Dipinjam" },
              { value: "MAINTENANCE", label: "Maintenance" },
            ]}
          />
        </div>
      </div>

      {/* Deskripsi — only in full mode */}
      {!compact && (
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <input className="input" placeholder="Keterangan opsional" value={form.keterangan} onChange={e => onChange("keterangan", e.target.value)} />
        </div>
      )}
    </>
  );
}
