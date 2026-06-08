// app/petugas/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import StatCard from "@/components/StatCard";
import { fDateShort, isOverdue } from "@/helpers/format";
import { api } from "@/helpers/api";
import type { Transaksi } from "@/types";

export default function PetugasDashboard() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [userId, setUserId]       = useState<string | null>(null);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Ambil userId dari API session endpoint
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setUserId(d.id);
        return api.get<Transaksi[]>(`/api/transaksi?userId=${d.id}`);
      })
      .then(setTransaksi)
      .catch(console.error);
  }, []);

  const aktif    = transaksi.filter((t) => t.status === "AKTIF").length;
  const selesai  = transaksi.filter((t) => t.status === "SELESAI").length;
  const terlambat = transaksi.filter((t) => t.status === "TERLAMBAT").length;

  const statusBadge: Record<string, string> = {
    AKTIF: "badge-warn", SELESAI: "badge-ok", TERLAMBAT: "badge-danger",
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard Petugas</h1>
        <p className="page-sub">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Sedang Dipinjam"  value={aktif}     icon="ti-arrow-bar-to-down" badge="Aktif"     badgeClass="badge-warn" />
        <StatCard label="Sudah Dikembalikan" value={selesai} icon="ti-circle-check"      badge="Selesai"   badgeClass="badge-ok" />
        <StatCard label="Terlambat"         value={terlambat} icon="ti-alert-circle"     badge="Alert"     badgeClass="badge-danger" />
      </div>

      {/* Quick Actions */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Link href="/petugas/pinjam" className="glass" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: "rgba(65,90,119,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-arrow-bar-to-down" style={{ fontSize: 24, color: "var(--ds-mist)" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Pinjam Barang</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Form peminjaman aset baru</div>
          </div>
        </Link>
        <Link href="/petugas/kembali" className="glass" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: "rgba(65,90,119,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-arrow-bar-to-up" style={{ fontSize: 24, color: "var(--ds-mist)" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Kembalikan Barang</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Catat pengembalian aset</div>
          </div>
        </Link>
      </div>

      {/* Recent transactions */}
      <div className="glass">
        <div style={{ padding: "16px 20px 0" }}>
          <div className="section-header">
            <span className="section-label">Peminjaman Saya</span>
            <Link href="/petugas/riwayat" className="see-all">Lihat semua →</Link>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Barang</th><th>Tgl Pinjam</th><th>Deadline</th><th>Status</th></tr>
            </thead>
            <tbody>
              {transaksi.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state" style={{ padding: "28px 0" }}>
                      <i className="ti ti-inbox" style={{ fontSize: 28 }} />
                      Belum ada transaksi
                    </div>
                  </td>
                </tr>
              ) : transaksi.slice(0, 6).map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.barang.nama}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{t.barang.kodeBarang}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fDateShort(t.tanggalPinjam)}</td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ color: isOverdue(t.deadlineKembali) && t.status === "AKTIF" ? "var(--color-err)" : "inherit" }}>
                      {fDateShort(t.deadlineKembali)}
                    </span>
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
