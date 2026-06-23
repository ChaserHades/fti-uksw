// app/admin/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import PinjamManager from "@/components/features/PinjamManager";
import RuanganManager from "@/components/features/RuanganManager";
import RiwayatManager from "@/components/features/RiwayatManager";
import LaporanManager from "@/components/features/LaporanManager";

function ManajemenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tab = searchParams.get("tab") || "barang";

  const tabs = [
    { id: "barang", label: "Aset", icon: "ti-box" },
    { id: "pinjam", label: "Peminjaman", icon: "ti-arrows-exchange" },
    { id: "ruangan", label: "Ruangan", icon: "ti-building" },
    { id: "riwayat", label: "Riwayat", icon: "ti-history" },
    { id: "laporan", label: "Cashflow", icon: "ti-receipt" },
  ];

  const handleTabChange = (newTab: string) => {
    router.push(`/admin/manajemen?tab=${newTab}`);
  };

  return (
    <>
      {/* Unified Header & Navigation in a single row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Manajemen Terpadu</h1>
          <p className="page-sub">Kelola seluruh aset, ruangan, dan riwayat dalam satu layar kerja</p>
        </div>

        <div className="mode-switcher" style={{ margin: 0, padding: 4, background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
              style={{ border: "none", boxShadow: tab === t.id ? "0 4px 12px rgba(255, 87, 34, 0.3)" : "none", background: tab === t.id ? "var(--ds-mid)" : "transparent" }}
              onClick={() => handleTabChange(t.id)}
            >
              <i className={`ti ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render Component based on tab */}
      <div className="workspace-container">
        {tab === "barang" && <BarangManager role="ADMIN" />}
        {tab === "pinjam" && <PinjamManager role="ADMIN" />}
        {tab === "ruangan" && <RuanganManager role="ADMIN" />}
        {tab === "riwayat" && <RiwayatManager role="ADMIN" />}
        {tab === "laporan" && <LaporanManager role="ADMIN" />}
      </div>
    </>
  );
}

export default function AdminManajemenPage() {
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: "50vh" }}><div className="spinner" /></div>}>
      <ManajemenContent />
    </Suspense>
  );
}
