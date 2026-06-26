// app/admin/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import PinjamManager from "@/components/features/PinjamManager";
import RiwayatManager from "@/components/features/RiwayatManager";
import LaporanManager from "@/components/features/LaporanManager";

function ManajemenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get("tab") || "barang";

  const tabs = [
    { id: "barang", label: "Aset", icon: "ti-box" },
    { id: "pinjam", label: "Peminjaman", icon: "ti-arrows-exchange" },
    { id: "riwayat", label: "Riwayat", icon: "ti-history" },
    { id: "laporan", label: "Cashflow", icon: "ti-receipt" },
  ];

  const handleTabChange = (newTab: string) => {
    router.push(`/admin/manajemen?tab=${newTab}`);
  };

  return (
    <>
      {/* Unified Header & Navigation in a single row */}
      <div className="page-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 16 }}>
        <div>
          <h1 className="page-title">Inventaris</h1>
          <p className="page-sub">Kelola Inventaris & Aset</p>
        </div>

        <div className="mode-switcher mobile-scroll-x" style={{ display: "flex", gap: "4px", margin: 0, padding: "6px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)" }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 600 : 500,
                  color: active ? "#FFF" : "var(--text-secondary)",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  border: "1px solid", borderColor: active ? "rgba(255,255,255,0.1)" : "transparent",
                  boxShadow: active ? "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0
                }}
              >
                <i className={`ti ${t.icon}`} style={{ fontSize: "16px", opacity: active ? 1 : 0.7 }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Component based on tab */}
      <div className="workspace-container">
        {tab === "barang" && <BarangManager role="ADMIN" />}
        {tab === "pinjam" && <PinjamManager role="ADMIN" />}
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
