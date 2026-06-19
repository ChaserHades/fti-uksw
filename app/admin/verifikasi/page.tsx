// app/admin/verifikasi/page.tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import { verifikasiUserAction } from "@/actions/verifikasi";
import type { User } from "@/types";

type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function VerifikasiPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [filter, setFilter]   = useState<FilterStatus>("PENDING");
  const [loading, setLoading] = useState<string | null>(null); // userId yang sedang diproses
  const [isPending, startTransition] = useTransition();

  const load = () =>
    api.get<User[]>("/api/users").then(setUsers).catch(console.error);

  useEffect(() => { load(); }, []);

  async function handleAction(userId: string, action: "APPROVE" | "REJECT") {
    setLoading(userId);
    startTransition(async () => {
      const result = await verifikasiUserAction(userId, action);
      if (result.success) {
        toast.success(result.message);
        await load();
      } else {
        toast.error(result.message);
      }
      setLoading(null);
    });
  }

  const filtered = filter === "ALL"
    ? users
    : users.filter((u) => u.statusVerifikasi === filter);

  const pendingCount = users.filter((u) => u.statusVerifikasi === "PENDING").length;

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warn", APPROVED: "badge-ok", REJECTED: "badge-danger",
  };
  const roleBadge: Record<string, string> = {
    ADMIN: "badge-danger", PETUGAS: "badge-info", UNIVERSITAS: "badge-muted",
  };

  return (
    <>
      <PageHeader title="Verifikasi User" subtitle="Kelola akses pengguna sistem">
        <select
          className="select"
          style={{ width: 180 }}
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
        <div className="alert alert-warn mb-16">
          <i className="ti ti-info-circle" />
          Ada <strong>{pendingCount}</strong> user menunggu verifikasi
        </div>
      )}

      <div className="glass">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Tgl Daftar</th>
                <th>Aksi</th>
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
              ) : filtered.map((u) => {
                const isProcessing = loading === u.id;
                return (
                  <tr key={u.id}>
                    <td className="td-name">
                      {u.name ?? "—"}
                    </td>
                    <td className="td-mono td-sm">
                      {u.email}
                    </td>
                    <td>
                      <span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[u.statusVerifikasi]}`}>
                        {u.statusVerifikasi}
                      </span>
                    </td>
                    <td className="td-sm">{fDateShort(u.createdAt)}</td>
                    <td>
                      {u.statusVerifikasi === "PENDING" ? (
                        <div className="action-row">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleAction(u.id, "APPROVE")}
                            disabled={isProcessing || isPending}
                          >
                            {isProcessing
                              ? <div className="spinner" style={{ width: 12, height: 12 }} />
                              : <i className="ti ti-check" />
                            }
                            Setujui
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleAction(u.id, "REJECT")}
                            disabled={isProcessing || isPending}
                          >
                            {isProcessing
                              ? <div className="spinner" style={{ width: 12, height: 12 }} />
                              : <i className="ti ti-x" />
                            }
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                      )}
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