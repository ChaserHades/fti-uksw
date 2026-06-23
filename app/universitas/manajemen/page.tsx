// app/universitas/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import LaporanManager from "@/components/features/LaporanManager";

function ManajemenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tab = searchParams.get("tab") || "barang";

  const tabs = [
    { id: "barang", label: "Daftar Aset", icon: "ti-box" },
    { id: "laporan", label: "Cashflow", icon: "ti-receipt" },
  ];

  const handleTabChange = (newTab: string) => {
    router.push(`/universitas/manajemen?tab=${newTab}`);
  };

  return (
    <>
      <div className="dash-heading" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Monitoring Aset</h1>
        <p className="page-sub">Pantau seluruh aset dan pergerakan dana universitas</p>
      </div>

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

      <div className="workspace-container">
        {tab === "barang" && <BarangManager role="UNIVERSITAS" />}
        {tab === "laporan" && <LaporanManager role="UNIVERSITAS" />}
      </div>
    </>
  );
}

export default function UnivManajemenPage() {
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: "50vh" }}><div className="spinner" /></div>}>
      <ManajemenContent />
    </Suspense>
  );
}
