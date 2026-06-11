"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { Transaksi } from "@/types";

type StatusFilter = "" | "AKTIF" | "SELESAI" | "TERLAMBAT";

export default function TransaksiAdminPage() {
  const [list, setList]     = useState<Transaksi[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("");

  useEffect(() => {
    const params = filter ? `?status=${filter}` : "";
    api.get<Transaksi[]>(`/api/transaksi${params}`).then(setList).catch(console.error);
  }, [filter]);

  function exportCSV() {
    const headers = ["ID", "Barang", "Kode", "Peminjam", "Email", "Tgl Pinjam", "Deadline", "Tgl Kembali", "Status"];
    const rows = list.map((t) => [
      t.id,
      t.barang.nama,
      t.barang.kodeBarang,
      t.user.name ?? "",
      t.user.email,
      fDateShort(t.tanggalPinjam),
      fDateShort(t.deadlineKembali),
      t.tanggalKembali ? fDateShort(t.tanggalKembali) : "",
      t.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `laporan-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  }

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };

  return (
    <>
      <PageHeader title="Laporan Transaksi" subtitle="Riwayat lengkap peminjaman aset">
        <select
          className="select"
          style={{ width: 160 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
        >
          <option value="">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="SELESAI">Selesai</option>
          <option value="TERLAMBAT">Terlambat</option>
        </select>
        <button className="btn btn-primary" onClick={exportCSV}>
          <i className="ti ti-file-export" /> Export CSV
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: "Total Transaksi", value: list.length,                                        badge: "badge-info" },
          { label: "Sedang Dipinjam", value: list.filter((t) => t.status === "AKTIF").length,    badge: "badge-warn" },
          { label: "Terlambat",       value: list.filter((t) => t.status === "TERLAMBAT").length, badge: "badge-danger" },
        ].map((s) => (
          <div key={s.label} className="glass" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: 14, fontWeight: 700, padding: "4px 14px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="glass">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Barang</th><th>Peminjam</th><th>Tgl Pinjam</th>
                <th>Deadline</th><th>Tgl Kembali</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <i className="ti ti-file-off" style={{ fontSize: 28 }} />
                      Tidak ada data transaksi
                    </div>
                  </td>
                </tr>
              ) : list.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
                  </td>
                  <td>
                    <div style={{ color: "var(--text-primary)" }}>{t.user.name ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.user.email}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.tanggalPinjam)}</td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.deadlineKembali)}</td>
                  <td style={{ fontSize: 12 }}>
                    {t.tanggalKembali ? fDateShort(t.tanggalKembali) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[t.status]}`}>{t.status}</span>
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
