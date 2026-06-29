// app/universitas/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import LaporanManager from "@/components/features/LaporanManager";
import TabSwitcher from "@/components/TabSwitcher";

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Monitoring Aset</h1>
          <p className="page-sub">Pantau seluruh aset dan pergerakan dana universitas</p>
        </div>

        <TabSwitcher tabs={tabs} activeTab={tab} onTabChange={handleTabChange} />
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
