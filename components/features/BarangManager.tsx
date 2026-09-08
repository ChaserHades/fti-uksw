// components/features/BarangManager.tsx
"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DaftarBarangTab from "./barang/DaftarBarangTab";
import AddItemTab from "./barang/AddItemTab";
import KategoriTab from "./barang/KategoriTab";
import RuanganManager from "./RuanganManager";

type Tab = "daftar" | "add" | "kategori" | "ruangan";

/**
 * Root orchestrator for the Barang management section.
 * Renders tab navigation and delegates to focused sub-components.
 */
export default function BarangManager({ role = "ADMIN" }: { role?: string }) {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") as Tab | null;
  const [tab, setTab] = useState<Tab>(action || "daftar");

  useEffect(() => {
    if (action) setTab(action);
  }, [action]);

  const availableTabs: { key: Tab; icon: string; label: string }[] = [
    { key: "daftar", icon: "ti-list", label: "Daftar Barang" },
  ];
  if (role === "ADMIN") {
    availableTabs.push({ key: "kategori", icon: "ti-category", label: "Kategori" });
  }
  if (role === "ADMIN" || role === "TEKNISI") {
    availableTabs.push({ key: "add", icon: "ti-plus", label: "Add Item" });
    availableTabs.push({ key: "ruangan", icon: "ti-building", label: "Ruangan" });
  }

  return (
    <div className="animate-fade-in">
      {/* Tab switcher */}
      <div className="mobile-scroll-x" style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {availableTabs.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 4px", fontSize: "14px",
                fontWeight: active ? 600 : 500,
                color: active ? "#FFF" : "var(--text-secondary)",
                background: "transparent",
                border: "none", borderBottom: active ? "2px solid #FFF" : "2px solid transparent",
                transition: "all 0.2s", cursor: "pointer",
                marginBottom: "-1px", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <i className={`ti ${t.icon}`} style={{ opacity: active ? 1 : 0.6 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "daftar" && <DaftarBarangTab role={role} />}
      {tab === "add" && (role === "ADMIN" || role === "TEKNISI") && <AddItemTab />}
      {tab === "kategori" && role === "ADMIN" && <KategoriTab />}
      {tab === "ruangan" && (role === "ADMIN" || role === "TEKNISI") && <RuanganManager role={role} />}
    </div>
  );
}