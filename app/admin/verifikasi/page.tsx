// app/admin/verifikasi/page.tsx
"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import type { User } from "@/types";

type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function VerifikasiPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("PENDING");

  const load = () =>
    api.get<User[]>("/api/users").then(setUsers).catch(console.error);

  useEffect(() => { load(); }, []);

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    try {
      await api.post(`/api/users/${id}/verifikasi`, { action });
      toast.success(action === "APPROVE" ? "✅ User disetujui" : "❌ User ditolak");
      load();
    } catch { toast.error("Gagal memproses"); }
  }

  const filtered = filter === "ALL" ? users : users.filter((u) => u.statusVerifikasi === filter);

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warn", APPROVED: "badge-ok", REJECTED: "badge-danger",
  };
  const roleBadge: Record<string, string> = {
    ADMIN: "badge-danger", PETUGAS: "badge-info", UNIVERSITAS: "badge-muted",
  };

  const pendingCount = users.filter((u) => u.statusVerifikasi === "PENDING").length;

  return (
    <>
      <PageHeader title="Verifikasi User" subtitle="Kelola akses pengguna sistem">
        <select
          className="select"
          style={{ width: 160 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterStatus)}
        >
          <option value="PENDING">Pending ({pendingCount})</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">Semua</option>
        </select>
      </PageHeader>

      {pendingCount > 0 && filter === "PENDING" && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          Ada <strong>{pendingCount}</strong> user menunggu verifikasi
        </div>
      )}

      <div className="glass">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th><th>Email</th><th>Role</th>
              <th>Status</th><th>Daftar</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <i className="ti ti-users-minus" style={{ fontSize: 28 }} />
                    Tidak ada user {filter !== "ALL" ? filter.toLowerCase() : ""}
                  </div>
                </td>
              </tr>
            ) : filtered.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{u.name ?? "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
                <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                <td>
                  <span className={`badge ${statusBadge[u.statusVerifikasi]}`}>
                    {u.statusVerifikasi}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{fDateShort(u.createdAt)}</td>
                <td>
                  {u.statusVerifikasi === "PENDING" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAction(u.id, "APPROVE")}
                      >
                        <i className="ti ti-check" /> Setujui
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleAction(u.id, "REJECT")}
                      >
                        <i className="ti ti-x" /> Tolak
                      </button>
                    </div>
                  )}
                  {u.statusVerifikasi !== "PENDING" && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
