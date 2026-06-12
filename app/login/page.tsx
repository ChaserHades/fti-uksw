"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(fd);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/uksw.png" alt="Logo" width="100" />
            </div>
            <h1 className="auth-title">Aset FTI UKSW</h1>
            <p className="auth-sub">Sistem Manajemen Aset Fakultas Teknologi Informasi</p>
          </div>
          <div className="glass" style={{ padding: "28px" }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  placeholder="email@domain.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  name="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                disabled={isPending}
              >
                {isPending
                  ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Memverifikasi...</>
                  : <><i className="ti ti-login" /> Masuk</>
                }
              </button>
            </form>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <Link href="/register" style={{ color: "var(--ds-mist)" }}>Daftar Akun Baru</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}