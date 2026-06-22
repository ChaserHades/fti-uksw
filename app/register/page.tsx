"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { registerAction } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerAction(fd);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(result.success ?? "Registrasi berhasil!");
        router.push("/login");
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
            <div className="auth-logo">A</div>
            <h1 className="auth-title">Daftar Akun</h1>
            <p className="auth-sub">Akun baru perlu diverifikasi oleh Admin</p>
          </div>
          <div className="auth-body">
            {error && (
              <div className="alert alert-danger mb-16">
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input name="name" className="input" placeholder="Nama lengkap" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="input" placeholder="email@domain.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input name="password" type="password" className="input" placeholder="Minimal 8 karakter" required minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Role yang Diajukan</label>
                <select name="role" className="select">
                  <option value="TEKNISI">Teknisi</option>
                  <option value="UNIVERSITAS">Universitas</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isPending}
              >
                {isPending
                  ? <><div className="spinner spinner-sm" /> Mendaftar...</>
                  : "Daftar"
                }
              </button>
            </form>
            <div className="auth-footer">
              Sudah punya akun?{" "}
              <Link href="/login">Masuk di sini</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}