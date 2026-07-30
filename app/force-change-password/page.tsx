"use client";
import { useState, useTransition } from "react";
import { changePasswordAction } from "@/actions/auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ForceChangePasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await changePasswordAction(fd);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Password berhasil diganti.");
        // The middleware and requireAuth check will now pass since mustChangePassword is false.
        // Let's redirect to root to let the normal auth flow route them to their dashboard
        router.push("/");
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
            <h1 className="auth-title text-danger">Ganti Password Wajib</h1>
            <p className="auth-sub">
              Admin telah mereset password Anda. Untuk alasan keamanan, Anda wajib membuat password baru sekarang.
            </p>
          </div>
          <div className="auth-body">
            {error && (
              <div className="alert alert-danger mb-16">
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input
                  name="password"
                  type="password"
                  className="input"
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <input
                  name="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full mt-4"
                disabled={isPending}
              >
                {isPending
                  ? <><div className="spinner spinner-sm" /> Menyimpan...</>
                  : <><i className="ti ti-device-floppy" /> Ganti Password</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
