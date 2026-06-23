// app/admin/riwayat/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { Transaksi } from "@/types";

type StatusFilter = "" | "AKTIF" | "SELESAI" | "TERLAMBAT";

export default function RiwayatManager({ role = "ADMIN" }: { role?: string }) {
  const [list,   setList]   = useState<Transaksi[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("");

  useEffect(() => {
    const params = filter ? `?status=${filter}` : "";
    api.get<Transaksi[]>(`/api/transaksi${params}`).then(setList).catch(console.error);
  }, [filter]);

  function exportCSV() {
    const headers = [
      "ID", "Barang", "Kode", "Nama Peminjam", "Ruangan Pinjam",
      "Petugas", "Email Petugas", "Tgl Pinjam", "Deadline", "Tgl Kembali", "Status", "Terlambat",
    ];
    const rows = list.map(t => [
      t.id,
      t.barang.nama,
      t.barang.kodeBarang,
      t.namaPeminjam,
      t.ruanganPinjam,
      t.user.name ?? "",
      t.user.email,
      fDateShort(t.tanggalPinjam),
      fDateShort(t.deadlineKembali),
      t.tanggalKembali ? fDateShort(t.tanggalKembali) : "",
      t.status,
      t.terlambat ? "Ya" : "Tidak",
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `riwayat-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  }

  // Badge status — terlambat persisten
  function getBadge(t: Transaksi) {
    if (t.terlambat) return { cls: "badge-danger", label: "Terlambat" };
    if (t.status === "AKTIF") return { cls: "badge-warn", label: "Aktif" };
    return { cls: "badge-ok", label: "Selesai" };
  }

  return (
    <>
      <PageHeader title="Riwayat Transaksi" subtitle="Riwayat lengkap peminjaman aset">
        <div style={{ flex: "0 1 160px", minWidth: 140 }}>
          <LiquidSelect
            value={filter}
            onChange={val => setFilter(val as StatusFilter)}
            options={[
              { value: "", label: "Semua Status" },
              { value: "AKTIF", label: "Aktif" },
              { value: "SELESAI", label: "Selesai" },
              { value: "TERLAMBAT", label: "Terlambat" }
            ]}
          />
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid-3 mb-16">
        {[
          { label: "Total Transaksi", value: list.length,                                badge: "badge-info"   },
          { label: "Sedang Dipinjam", value: list.filter(t => t.status === "AKTIF").length, badge: "badge-warn"   },
          { label: "Terlambat",       value: list.filter(t => t.terlambat).length,         badge: "badge-danger" },
        ].map(s => (
          <div key={s.label} className="glass summary-badge-row">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: 14, fontWeight: 700, padding: "4px 14px", flexShrink: 0 }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Barang</th>
                <th style={{ width: "14%" }}>Peminjam</th>
                <th style={{ width: "12%" }}>Ruangan</th>
                <th style={{ width: "12%" }}>Petugas</th>
                <th style={{ width: "11%" }}>Tgl Pinjam</th>
                <th style={{ width: "11%" }}>Deadline</th>
                <th style={{ width: "11%" }}>Tgl Kembali</th>
                <th style={{ width: "11%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <i className="ti ti-file-off" style={{ fontSize: 28 }} />
                      Tidak ada data transaksi
                    </div>
                  </td>
                </tr>
              ) : list.map(t => {
                const badge = getBadge(t);
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="td-name">{t.barang.nama}</div>
                      <div className="td-code">{t.barang.kodeBarang}</div>
                    </td>
                    <td>
                      <div className="td-sm" style={{ color: "var(--text-primary)" }}>{t.namaPeminjam}</div>
                    </td>
                    <td className="td-sm">{t.ruanganPinjam}</td>
                    <td>
                      <div className="td-sm" style={{ color: "var(--text-secondary)" }}>{t.user.name ?? "—"}</div>
                      <div className="td-code">{t.user.email}</div>
                    </td>
                    <td className="td-sm">{fDateShort(t.tanggalPinjam)}</td>
                    <td className="td-sm">{fDateShort(t.deadlineKembali)}</td>
                    <td style={{ fontSize: 12 }}>
                      {t.tanggalKembali
                        ? fDateShort(t.tanggalKembali)
                        : <span style={{ color: "var(--text-muted)" }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
