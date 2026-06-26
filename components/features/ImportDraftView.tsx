"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface DraftRow {
  _rowNumber: number;
  _errorReason?: string;
  jenisBarang: string;
  label?: string;
  labelAset?: string;
  nama?: string;
  sn?: string;
  merek?: string;
  model?: string;
  tipe?: string;
  vendor?: string;
  keterangan?: string;
  kondisi?: string;
  status?: string;
  letak?: string;
  tanggalDatang?: string | Date;
  tanggalPindah?: string | Date;
  harga?: number;
  jumlah?: number;
  sumberTahun?: string;
}

interface ImportDraftViewProps {
  draftValid: DraftRow[];
  draftError: DraftRow[];
  onCancel: () => void;
  onPush: (data: DraftRow[]) => void;
  pushing: boolean;
}

export default function ImportDraftView({ draftValid, draftError, onCancel, onPush, pushing }: ImportDraftViewProps) {
  const [tab, setTab] = useState<"valid" | "error">("error");
  const [errors, setErrors] = useState<DraftRow[]>(draftError);
  const [valids, setValids] = useState<DraftRow[]>(draftValid);

  // inline edit
  const handleEdit = (index: number, field: keyof DraftRow, value: any) => {
    const newErrors = [...errors];
    newErrors[index] = { ...newErrors[index], [field]: value };
    
    // Check if error is resolved (e.g., jenisBarang is filled)
    const row = newErrors[index];
    if (row.jenisBarang && row.jenisBarang !== "Lainnya") {
      // It's valid now
      delete row._errorReason;
      setValids([...valids, row]);
      newErrors.splice(index, 1);
      if (newErrors.length === 0) setTab("valid");
    }
    
    setErrors(newErrors);
  };

  const hasErrors = errors.length > 0;

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white m-0">Pre-flight Check</h3>
        <div className="flex gap-2">
          <button className={`btn btn-sm ${tab === "error" ? "btn-danger" : "btn-ghost"}`} onClick={() => setTab("error")}>
            Error ({errors.length})
          </button>
          <button className={`btn btn-sm ${tab === "valid" ? "btn-ok" : "btn-ghost"}`} onClick={() => setTab("valid")}>
            Valid ({valids.length})
          </button>
        </div>
      </div>

      <div className="glass p-4 rounded-xl overflow-x-auto">
        <table className="table" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th className="w-10">Baris</th>
              {tab === "error" && <th className="text-err">Alasan Error</th>}
              <th>Jenis Barang *</th>
              <th>Nama / Merek</th>
              <th>Label</th>
              <th>Tahun File</th>
              <th>Letak</th>
            </tr>
          </thead>
          <tbody>
            {(tab === "error" ? errors : valids).length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-muted">Tidak ada data di tab ini.</td></tr>
            ) : (tab === "error" ? errors : valids).map((r, i) => (
              <tr key={r._rowNumber} className={tab === "error" ? "bg-red-500/5" : ""}>
                <td className="td-sm text-muted">{r._rowNumber}</td>
                {tab === "error" && (
                  <td className="td-sm text-err text-xs max-w-[150px] whitespace-normal">
                    {r._errorReason}
                  </td>
                )}
                <td>
                  {tab === "error" ? (
                    <input 
                      type="text" 
                      className="input input-sm border-err/50 focus:border-err" 
                      value={r.jenisBarang || ""} 
                      onChange={(e) => handleEdit(i, "jenisBarang", e.target.value)}
                      placeholder="Wajib diisi..."
                    />
                  ) : (
                    <span className="font-medium">{r.jenisBarang}</span>
                  )}
                </td>
                <td className="td-sm">{r.nama || r.merek || "-"}</td>
                <td className="td-code">{r.label || "-"}</td>
                <td className="td-sm">{r.sumberTahun || "-"}</td>
                <td className="td-sm">{r.letak || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button className="btn btn-ghost" onClick={onCancel} disabled={pushing}>Batal</button>
        <button 
          className="btn btn-primary" 
          disabled={hasErrors || valids.length === 0 || pushing} 
          onClick={() => onPush(valids)}
        >
          {pushing ? "Pushing..." : `Push ${valids.length} Data`}
        </button>
      </div>
    </div>
  );
}
