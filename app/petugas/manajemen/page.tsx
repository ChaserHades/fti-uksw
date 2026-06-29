// app/petugas/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import PinjamManager from "@/components/features/PinjamManager";
import RiwayatManager from "@/components/features/RiwayatManager";
import TabSwitcher from "@/components/TabSwitcher";

function ManajemenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tab = searchParams.get("tab") || "pinjam";

  const tabs = [
    { id: "pinjam", label: "Peminjaman", icon: "ti-arrows-exchange" },
    { id: "barang", label: "Ketersediaan", icon: "ti-list-search" },
    { id: "riwayat", label: "Riwayat", icon: "ti-history" },
  ];

  const handleTabChange = (newTab: string) => {
    router.push(`/petugas/manajemen?tab=${newTab}`);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Manajemen Operasional</h1>
          <p className="page-sub">Kelola peminjaman, pergerakan barang, dan ketersediaan stok</p>
        </div>

        <TabSwitcher tabs={tabs} activeTab={tab} onTabChange={handleTabChange} />
      </div>

      <div className="workspace-container">
        {tab === "pinjam" && <PinjamManager role="TEKNISI" />}
        {tab === "barang" && <BarangManager role="TEKNISI" />}
        {tab === "riwayat" && <RiwayatManager role="TEKNISI" />}
      </div>
    </>
  );
}

export default function PetugasManajemenPage() {
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: "50vh" }}><div className="spinner" /></div>}>
      <ManajemenContent />
    </Suspense>
  );
}
