// app/login/page.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
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
      // Jika sukses, loginAction akan redirect() otomatis
    });
  }

  return (
    <div className="ds-bg">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-wrapper">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            {/* <div className="auth-logo">A</div> */}
            <h1 className="auth-title">Aset FTI UKSW</h1>
            <p className="auth-sub">
              Sistem Manajemen Aset Fakultas Teknologi Informasi
            </p>
          </div>

          {/* Card */}
          <div className="glass" style={{ padding: "28px" }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <i className="ti ti-alert-circle" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Universitas</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  placeholder="nid@uksw.edu / nim@student.uksw.edu"
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
                {isPending ? (
                  <><div className="spinner" />Verifikasi</>
                ) : (
                  <><i className="ti ti-login" />Masuk</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="or-divider"><span>atau</span></div>

            {/* Google OAuth — redirect ke API route */}
            <a href="/api/auth/google" className="btn-google">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login dengan Google (UKSW)
            </a>

            {/* Links */}
            <div style={{
              marginTop: 20, display: "flex",
              justifyContent: "space-between", fontSize: 12,
            }}>
              <Link href="/register" style={{ color: "var(--ds-mist)" }}>
                Daftar Akun Baru
              </Link>
              <Link href="/forgot-password" style={{ color: "var(--ds-mist)" }}>
                Lupa Password?
              </Link>
            </div>

            </div>
                <div className="footer">
                  <p>&copy; 2026 Sistem Manajemen Aset FTI UKSW. All rights reserved.</p>
            </div>

        </div>
      </div>
    </div>
  );
}
