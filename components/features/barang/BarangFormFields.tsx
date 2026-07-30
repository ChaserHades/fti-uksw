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
  /** Read-only jika kode didapat dari mode recovery scan */
  readOnlyLabel?: boolean;
  /** Jika true, tampilkan lebih sedikit field (dari scan register modal) */
  compact?: boolean;
}

/** Generate base label dari kategori, merek, tanggal, dan pembelianKe */
function generateBaseLabel(kategoriNama: string, merek: string, tanggal: string, pembelianKe: string | number): string {
  if (!kategoriNama || !merek || !tanggal) return "";

  const katPart = kategoriNama.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const merkPart = merek.replace(/\s+/g, "").slice(0, 3).toUpperCase();

  const dateObj = new Date(tanggal);
  if (isNaN(dateObj.getTime())) return "";
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();

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
  // Nama kategori untuk generate label (diset dari typed input atau dari onSelect)
  const [kategoriNama, setKategoriNama] = useState("");
  const [isFetchingPembelianKe, setIsFetchingPembelianKe] = useState(false);
  // Preview label dengan suffix urutan aset dari backend
  const [previewLabelWithSeq, setPreviewLabelWithSeq] = useState("");

  // Base label tanpa suffix (untuk preview dan untuk dikirim ke backend)
  const baseLabel = generateBaseLabel(kategoriNama, form.merek, form.tanggalDatang, form.pembelianKe);

  // Fetch next label sequence dari backend setiap kali base label berubah
  useEffect(() => {
    if (!baseLabel || readOnlyLabel) {
      setPreviewLabelWithSeq(baseLabel);
      return;
    }
    let cancelled = false;
    fetch(`/api/barang/next-label-sequence?baseLabel=${encodeURIComponent(baseLabel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.nextLabel) {
          setPreviewLabelWithSeq(data.nextLabel);
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewLabelWithSeq(baseLabel + "-001");
      });
    return () => { cancelled = true; };
  }, [baseLabel, readOnlyLabel]);

  // Sinkronkan base label ke form (backend akan hitung suffix final)
  useEffect(() => {
    if (!readOnlyLabel && baseLabel) {
      onChange("label", baseLabel);
    }
  }, [baseLabel, readOnlyLabel]);




  useEffect(() => {
    if (form.pengeluaranId && !form.pengeluaranDisplayCode) {

      onChange("pengeluaranDisplayCode", "Memuat data...");
      fetch(`/api/pengeluaran/${form.pengeluaranId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            const formatKodePengeluaran = (p: any) => {
              if (p.jenisBukti && p.nomorBukti) return `${p.jenisBukti}-${p.nomorBukti}-${p.kodePembelian}`;
              if (p.jenisBukti) return `${p.jenisBukti}-${p.kodePembelian}`;
              return p.kodePembelian || p.judul;
            };
            onChange("pengeluaranDisplayCode", formatKodePengeluaran(data));
          } else {
            onChange("pengeluaranDisplayCode", form.pengeluaranId);
          }
        })
        .catch(() => onChange("pengeluaranDisplayCode", form.pengeluaranId));
    }
  }, [form.pengeluaranId, form.pengeluaranDisplayCode]);

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

    } finally {
      setIsFetchingPembelianKe(false);
    }
  }, [onChange]);

  const handleTanggalChange = (val: string) => {
    onChange("tanggalDatang", val);
    fetchPembelianKe(val);
  };

  // Helper to format Cashflow preview code
  const formatKodePengeluaran = (p: any) => {
    if (p.jenisBukti && p.nomorBukti) return `${p.jenisBukti}-${p.nomorBukti}-${p.kodePembelian}`;
    if (p.jenisBukti) return `${p.jenisBukti}-${p.kodePembelian}`;
    return p.kodePembelian || p.judul;
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
            onChange={val => {
              onChange("kategori", val);
              // Gunakan nilai yang diketik sebagai nama kategori jika tidak ada onSelect
              setKategoriNama(val);
            }}
            onSelect={opt => {
              // Saat memilih dari dropdown, gunakan label yang tepat
              setKategoriNama(opt.label);
            }}
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
              options={[{ value: "", label: "- Pilih Progdi -" }, ...PROGDI_OPTIONS]}
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

        {/* Label Preview (read-only, auto-generated) */}
        <div className="form-group">
          <label className="form-label">Kode Label (Auto)</label>
          <div
            className="input"
            style={{
              background: "var(--glass-bg)",
              opacity: previewLabelWithSeq ? 1 : 0.5,
              fontFamily: "monospace",
              letterSpacing: "1px",
              cursor: "default",
              userSelect: "all",
            }}
          >
            {previewLabelWithSeq || "- isi Kategori, Merek, dan Tanggal -"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Kode dibuat otomatis. Nomor aset unik ditentukan saat menyimpan.
          </div>
        </div>
      </div>

      {/* ── Row 4b: Tautkan ke Cashflow / Bukti Pembayaran ── */}
      <div className="form-group">
        <label className="form-label">Bukti Pembayaran / Cashflow <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(opsional)</span></label>
        <AsyncAutocomplete
          value={form.pengeluaranId || ""}
          displayValue={form.pengeluaranDisplayCode || form.pengeluaranId || ""}
          onChange={val => {

            onChange("pengeluaranDisplayCode", val);
            if (!val) onChange("pengeluaranId", "");
          }}
          onSelect={opt => {
            onChange("pengeluaranId", opt.value);
            onChange("pengeluaranDisplayCode", opt.label);
          }}
          fetchUrl="/api/pengeluaran"
          placeholder="Cari kode (misal: SPB-03/290...) atau judul..."
          mapOption={item => ({ value: item.id, label: formatKodePengeluaran(item) })}
        />
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Tautkan barang ini ke bukti pembayaran/nota di fitur Cashflow
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
