// app/admin/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import PinjamManager from "@/components/features/PinjamManager";
import RiwayatManager from "@/components/features/RiwayatManager";
import LaporanManager from "@/components/features/LaporanManager";
import TabSwitcher from "@/components/TabSwitcher";

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

        <TabSwitcher tabs={tabs} activeTab={tab} onTabChange={handleTabChange} />
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
