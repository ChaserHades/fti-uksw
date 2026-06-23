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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Monitoring Aset</h1>
          <p className="page-sub">Pantau seluruh aset dan pergerakan dana universitas</p>
        </div>

        <div className="mode-switcher" style={{ display: "flex", gap: "4px", margin: 0, padding: "6px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)" }}>
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
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", cursor: "pointer"
                }}
              >
                <i className={`ti ${t.icon}`} style={{ fontSize: "16px", opacity: active ? 1 : 0.7 }} />
                {t.label}
              </button>
            );
          })}
        </div>
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
