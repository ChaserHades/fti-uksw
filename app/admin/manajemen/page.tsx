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
      <div className="dash-heading" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Manajemen Terpadu</h1>
        <p className="page-sub">Kelola seluruh aset, ruangan, dan riwayat dalam satu layar kerja</p>
      </div>

      {/* Main Unified Navigation */}
      <div className="mode-switcher" style={{ marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => handleTabChange(t.id)}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
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
