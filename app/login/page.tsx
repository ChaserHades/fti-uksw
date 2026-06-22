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
    <div className="ds-bg" style={{ backgroundColor: "var(--ds-void)" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo" style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center" }}>
              <img src="/logo/UKSW%20NO%20BG.png" alt="Logo UKSW" style={{ height: "64px", width: "auto", objectFit: "contain" }} />
              <img src="/logo/FTI%20no%20bg.png" alt="Logo FTI" style={{ height: "64px", width: "auto", objectFit: "contain" }} />
            </div>
            <h1 className="auth-title">Aset FTI UKSW</h1>
            <p className="auth-sub">Sistem Manajemen Aset Fakultas Teknologi Informasi</p>
          </div>
          <div className="auth-body">
            {error && (
              <div className="alert alert-danger mb-16">
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
                className="btn btn-primary btn-full mt-4"
                disabled={isPending}
              >
                {isPending
                  ? <><div className="spinner spinner-sm" /> Memverifikasi...</>
                  : <><i className="ti ti-login" /> Masuk</>
                }
              </button>
            </form>
            <div className="auth-footer">
              <Link href="/register">Daftar Akun Baru</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}