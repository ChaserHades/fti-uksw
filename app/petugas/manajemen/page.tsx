// app/petugas/manajemen/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import BarangManager from "@/components/features/BarangManager";
import PinjamManager from "@/components/features/PinjamManager";
import RuanganManager from "@/components/features/RuanganManager";
import RiwayatManager from "@/components/features/RiwayatManager";

function ManajemenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tab = searchParams.get("tab") || "pinjam";

  const tabs = [
    { id: "pinjam", label: "Peminjaman", icon: "ti-arrows-exchange" },
    { id: "barang", label: "Ketersediaan", icon: "ti-list-search" },
    { id: "ruangan", label: "Ruangan", icon: "ti-building" },
    { id: "riwayat", label: "Riwayat", icon: "ti-history" },
  ];

  const handleTabChange = (newTab: string) => {
    router.push(`/petugas/manajemen?tab=${newTab}`);
  };

  return (
    <>
      <div className="dash-heading" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Manajemen Operasional</h1>
        <p className="page-sub">Kelola peminjaman, pergerakan barang, dan ketersediaan stok</p>
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
        {tab === "pinjam" && <PinjamManager role="TEKNISI" />}
        {tab === "barang" && <BarangManager role="TEKNISI" />}
        {tab === "ruangan" && <RuanganManager role="TEKNISI" />}
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
