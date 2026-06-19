// app/admin/tim/page.tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { api } from "@/helpers/api";
import { fDateShort } from "@/helpers/format";
import { verifikasiUserAction } from "@/actions/verifikasi";
import type { User } from "@/types";

type Tab = "anggota" | "verifikasi";
type FilterStatus = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function TimVerifikasiPage() {
  const [tab, setTab]           = useState<Tab>("anggota");
  const [users, setUsers]       = useState<User[]>([]);
  const [filter, setFilter]     = useState<FilterStatus>("PENDING");
  const [loading, setLoading]   = useState<string | null>(null);
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

  const pendingCount = users.filter(u => u.statusVerifikasi === "PENDING").length;
  const approvedUsers = users.filter(u => u.statusVerifikasi === "APPROVED" && u.role !== "ADMIN");
  const filteredVerifikasi = filter === "ALL"
    ? users
    : users.filter(u => u.statusVerifikasi === filter);

  const statusBadge: Record<string, string> = {
    PENDING: "badge-warn", APPROVED: "badge-ok", REJECTED: "badge-danger",
  };
  const roleBadge: Record<string, string> = {
    ADMIN: "badge-danger", TEKNISI: "badge-info", UNIVERSITAS: "badge-muted",
  };

  return (
    <>
      <PageHeader title="Tim & Verifikasi" subtitle="Kelola anggota tim dan verifikasi user baru">
        {pendingCount > 0 && (
          <button
            className={`btn ${tab === "verifikasi" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setTab("verifikasi")}
          >
            <i className="ti ti-alert-circle" />
            Perlu Diverifikasi
            <span className="badge badge-danger" style={{ marginLeft: 4, padding: "2px 8px", fontSize: 11 }}>{pendingCount}</span>
          </button>
        )}
      </PageHeader>

      {/* Tab Switcher */}
      <div className="mode-switcher">
        {([
          { key: "anggota" as Tab,     icon: "ti-users",      label: "Anggota Aktif" },
          { key: "verifikasi" as Tab,  icon: "ti-user-check", label: `Verifikasi ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
        ]).map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Anggota Aktif */}
      {tab === "anggota" && (
        <div className="glass">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Nama</th><th>Email</th>
                  <th>Role</th><th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <i className="ti ti-users" style={{ fontSize: 28 }} />
                        Belum ada anggota aktif
                      </div>
                    </td>
                  </tr>
                ) : approvedUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td className="td-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="td-name">{u.name ?? "—"}</td>
                    <td className="td-mono td-sm">{u.email}</td>
                    <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                    <td className="td-sm">{fDateShort(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Verifikasi */}
      {tab === "verifikasi" && (
        <>
          <div className="glass filter-bar mb-16">
            <select
              className="select"
              style={{ width: 180 }}
              value={filter}
              onChange={e => setFilter(e.target.value as FilterStatus)}
            >
              <option value="PENDING">Pending ({pendingCount})</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">Semua</option>
            </select>
          </div>

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
                    <th>Nama</th><th>Email</th><th>Role</th>
                    <th>Status</th><th>Tgl Daftar</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerifikasi.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <i className="ti ti-users-minus" style={{ fontSize: 28 }} />
                          Tidak ada user {filter !== "ALL" ? filter.toLowerCase() : ""}
                        </div>
                      </td>
                    </tr>
                  ) : filteredVerifikasi.map(u => {
                    const isProcessing = loading === u.id;
                    return (
                      <tr key={u.id}>
                        <td className="td-name">{u.name ?? "—"}</td>
                        <td className="td-mono td-sm">{u.email}</td>
                        <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                        <td><span className={`badge ${statusBadge[u.statusVerifikasi]}`}>{u.statusVerifikasi}</span></td>
                        <td className="td-sm">{fDateShort(u.createdAt)}</td>
                        <td>
                          {u.statusVerifikasi === "PENDING" ? (
                            <div className="action-row">
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleAction(u.id, "APPROVE")}
                                disabled={isProcessing || isPending}
                              >
                                {isProcessing ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <i className="ti ti-check" />}
                                Setujui
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleAction(u.id, "REJECT")}
                                disabled={isProcessing || isPending}
                              >
                                {isProcessing ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <i className="ti ti-x" />}
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
      )}
    </>
  );
}
