// app/petugas/riwayat/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import LiquidSelect from "@/components/LiquidSelect";
import { fDateShort, isOverdue } from "@/helpers/format";
import { api } from "@/helpers/api";
import type { Transaksi } from "@/types";

type StatusFilter = "" | "AKTIF" | "SELESAI" | "TERLAMBAT";

export default function RiwayatPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [filter, setFilter]       = useState<StatusFilter>("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const params = new URLSearchParams({ userId: d.id });
        // "TERLAMBAT" is a computed filter — fetch all/AKTIF then filter client-side
        if (filter && filter !== "TERLAMBAT") params.set("status", filter);
        return api.get<Transaksi[]>(`/api/transaksi?${params}`);
      })
      .then((data) => {
        if (filter === "TERLAMBAT") {
          // Show both: actively overdue AND returned-late (terlambat=true)
          setTransaksi(data.filter(t =>
            (t.status === "AKTIF" && isOverdue(t.deadlineKembali)) || t.terlambat
          ));
        } else {
          setTransaksi(data);
        }
      })
      .catch(console.error);
  }, [filter]);

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok",
  };

  return (
    <>
      <PageHeader title="Riwayat Peminjaman" subtitle="Semua transaksi milik Anda">
        <LiquidSelect
          value={filter}
          onChange={(val) => setFilter(val as StatusFilter)}
          options={[
            { value: "", label: "Semua Status" },
            { value: "AKTIF", label: "Aktif" },
            { value: "TERLAMBAT", label: "Terlambat" },
            { value: "SELESAI", label: "Selesai" }
          ]}
          className="w-40"
        />
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
              ) : transaksi.map((t) => {
                const activelyLate = t.status === "AKTIF" && isOverdue(t.deadlineKembali);
                // Persistent: show "Terlambat" badge even for SELESAI if t.terlambat === true
                const wasLate = t.terlambat === true;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="td-name">{t.barang.nama}</div>
                      <div className="td-code">{t.barang.kodeBarang}</div>
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
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {activelyLate
                          ? <span className="badge badge-danger">TERLAMBAT</span>
                          : <span className={`badge ${statusBadge[t.status]}`}>{t.status}</span>
                        }
                        {/* Persistent badge: if returned late */}
                        {wasLate && t.status === "SELESAI" && (
                          <span className="badge badge-danger" style={{ opacity: 0.7, fontSize: 10 }}>Terlambat</span>
                        )}
                      </div>
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