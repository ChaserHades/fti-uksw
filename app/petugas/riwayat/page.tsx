// app/petugas/riwayat/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { fDateShort } from "@/helpers/format";
import { api } from "@/helpers/api";
import type { Transaksi } from "@/types";

type StatusFilter = "" | "AKTIF" | "SELESAI" | "TERLAMBAT";

export default function RiwayatPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [filter, setFilter]       = useState<StatusFilter>("");

  useEffect(() => {
    // Ambil userId dulu dari /api/me, lalu filter
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const params = new URLSearchParams({ userId: d.id });
        if (filter) params.set("status", filter);
        return api.get<Transaksi[]>(`/api/transaksi?${params}`);
      })
      .then(setTransaksi)
      .catch(console.error);
  }, [filter]);

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };

  return (
    <>
      <PageHeader title="Riwayat Peminjaman" subtitle="Semua transaksi milik Anda">
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
      </PageHeader>

      <div className="glass">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Barang</th><th>Tgl Pinjam</th>
                <th>Deadline</th><th>Tgl Kembali</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transaksi.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <i className="ti ti-history" style={{ fontSize: 28 }} />
                      Belum ada riwayat transaksi
                    </div>
                  </td>
                </tr>
              ) : transaksi.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.tanggalPinjam)}</td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.deadlineKembali)}</td>
                  <td style={{ fontSize: 12 }}>
                    {t.tanggalKembali
                      ? fDateShort(t.tanggalKembali)
                      : <span style={{ color: "var(--text-muted)" }}>—</span>
                    }
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
