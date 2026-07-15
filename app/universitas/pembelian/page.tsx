// app/universitas/pembelian/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { Pengeluaran } from "@/types";

type JenisFilter = "" | "PEMBELIAN_ASET" | "MAINTENANCE" | "LAINNYA";

const jenisLabel: Record<string, string> = {
  PEMBELIAN_ASET: "Pembelian Aset",
  MAINTENANCE: "Maintenance",
  LAINNYA: "Lainnya",
};
const jenisBadge: Record<string, string> = {
  PEMBELIAN_ASET: "badge-info",
  MAINTENANCE: "badge-warn",
  LAINNYA: "badge-muted",
};

export default function CashflowUniversitasPage() {
  const [list, setList] = useState<Pengeluaran[]>([]);
  const [filter, setFilter] = useState<JenisFilter>("");

  const load = () => {
    const params = filter ? `?jenis=${filter}` : "";
    api.get<Pengeluaran[]>(`/api/pengeluaran${params}`).then(setList).catch(console.error);
  };

  useEffect(() => { load(); }, [filter]);

  function exportCSV() {
    const headers = ["Judul", "Jenis", "Nominal (Rp)", "Tanggal", "Deskripsi", "Pencatat"];
    const rows = list.map(p => [
      p.judul,
      jenisLabel[p.jenis] ?? p.jenis,
      p.nominal.toString(),
      fDateShort(p.tanggal),
      p.keterangan ?? "",
      p.user.name ?? p.user.email,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `laporan-pengeluaran-fti-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const totalNominal = list.reduce((sum, p) => sum + p.nominal, 0);

  return (
    <>
      <PageHeader title="Laporan Pengeluaran FTI" subtitle="Data pembelian aset, maintenance, dan pengeluaran lainnya (Read-only)" />

      {/* Filters & Export */}
      <div className="glass filter-bar mb-16" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <LiquidSelect
          value={filter}
          onChange={(val) => setFilter(val as JenisFilter)}
          options={[
            { value: "", label: "Semua Jenis" },
            { value: "PEMBELIAN_ASET", label: "Pembelian Aset" },
            { value: "MAINTENANCE", label: "Maintenance" },
            { value: "LAINNYA", label: "Lainnya" }
          ]}
          style={{ width: 180 }}
        />
        <button className="btn btn-ghost" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-16">
        {[
          { label: "Total Data Pengeluaran", value: list.length, badge: "badge-info" },
          { label: "Total Nominal", value: `Rp ${totalNominal.toLocaleString("id-ID")}`, badge: "badge-warn" },
          { label: "Pembelian Aset", value: list.filter(p => p.jenis === "PEMBELIAN_ASET").length, badge: "badge-ok" },
        ].map(s => (
          <div key={s.label} className="glass summary-badge-row">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Judul</th>
                <th style={{ width: "15%" }}>Jenis</th>
                <th style={{ width: "18%" }}>Nominal</th>
                <th style={{ width: "12%" }}>Tanggal</th>
                <th style={{ width: "18%" }}>Pencatat</th>
                <th style={{ width: "12%" }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <i className="ti ti-file-off" style={{ fontSize: 28 }} />
                      Belum ada data pengeluaran
                    </div>
                  </td>
                </tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="td-name">{p.judul}</div>
                    {p.keterangan && <div className="td-code">{p.keterangan}</div>}
                  </td>
                  <td><span className={`badge ${jenisBadge[p.jenis]}`}>{jenisLabel[p.jenis]}</span></td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                    Rp {p.nominal.toLocaleString("id-ID")}
                  </td>
                  <td className="td-sm">{fDateShort(p.tanggal)}</td>
                  <td className="td-sm">{p.user.name ?? "—"}</td>
                  <td>
                    {p.notaUrls && p.notaUrls.length > 0 ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        {p.notaUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener" className="btn btn-ghost btn-icon btn-sm" title={`Lihat Nota ${i + 1}`}>
                            <i className="ti ti-file-check" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
