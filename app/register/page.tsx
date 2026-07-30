"use client";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { registerAction } from "@/actions/auth";
import LiquidSelect from "@/components/LiquidSelect";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TEKNISI");

  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
  }, []);

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
        toast.success(result.success ?? "Registrasi berhasil.");
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
            <div className="auth-logo" style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center" }}>
              <img src="/logo/UKSW%20NO%20BG.png" alt="Logo UKSW" style={{ height: "64px", width: "auto", objectFit: "contain" }} />
              <img src="/logo/FTI%20no%20bg.png" alt="Logo FTI" style={{ height: "64px", width: "auto", objectFit: "contain" }} />
            </div>
            <h1 className="auth-title">Daftar Akun</h1>
            <p className="auth-sub">Akun baru perlu diverifikasi oleh Admin</p>
          </div>
          <div className="auth-body">
            {error && (
              <div className="alert alert-danger mb-16">
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  name="name"
                  className="input"
                  placeholder="Nama lengkap"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  placeholder="email@domain.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  name="password"
                  type="password"
                  className="input"
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role yang Diajukan</label>
                <LiquidSelect
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: "TEKNISI", label: "Teknisi" },
                    { value: "UNIVERSITAS", label: "Universitas" }
                  ]}
                />
                <input type="hidden" name="role" value={role} />
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