"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/helpers/api";

interface Option {
  value: string;
  label: string;
}

interface LiquidSelectAsyncProps {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (opt: Option) => void;
  fetchUrl: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Function to map API response items to Option {value, label} */
  mapOption: (item: any) => Option;
}

export default function LiquidSelectAsync({
  value,
  onChange,
  onSelect,
  fetchUrl,
  placeholder = "Pilih...",
  className = "",
  style,
  mapOption,
}: LiquidSelectAsyncProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const loadData = async (reset = true) => {
    setLoading(true);
    const currentCursor = reset ? null : cursor;
    
    // Parse base URL and query params
    const url = new URL(fetchUrl, window.location.origin);
    url.searchParams.set("limit", "10");
    if (currentCursor) url.searchParams.set("cursor", currentCursor);

    try {
      const res = await api.get<{ data: any[]; nextCursor: string | null }>(url.pathname + url.search);
      const newOptions = res.data.map(mapOption);
      
      setOptions(prev => reset ? newOptions : [...prev, ...newOptions]);
      setCursor(res.nextCursor);
      
      // Update selected label if value is present in new options
      if (value) {
        const found = (reset ? newOptions : [...options, ...newOptions]).find(o => o.value === value);
        if (found) setSelectedLabel(found.label);
      }
    } catch (e) {
      console.error("Failed to load options", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const newState = !open;
    setOpen(newState);
    if (newState && options.length === 0) {
      loadData(true);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", ...style }} className={className}>
      <div 
        className={`select ${open ? "active" : ""}`} 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          borderColor: open ? "var(--color-info)" : "rgba(255, 255, 255, 0.1)",
          boxShadow: open ? "0 0 0 1px var(--color-info)" : "none",
          cursor: "pointer",
        }}
        onClick={handleOpen}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedLabel || (value && options.find(o => o.value === value)?.label) || placeholder}
        </span>
      </div>
      
      {open && (
        <div 
          className="glass"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: 250,
            overflowY: "auto",
            padding: 4,
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            background: "rgba(30, 30, 32, 0.95)"
          }}
        >
          {/* We allow an option to clear the filter if it's used as a filter */}
          <div
            onClick={() => {
              onChange("");
              if (onSelect) onSelect({ value: "", label: "" });
              setSelectedLabel("");
              setOpen(false);
            }}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 4,
              cursor: "pointer",
              background: value === "" ? "rgba(255, 255, 255, 0.1)" : "transparent",
              color: value === "" ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => {
              if (value !== "") {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.05)";
                (e.currentTarget as HTMLDivElement).style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={e => {
              if (value !== "") {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
                (e.currentTarget as HTMLDivElement).style.color = "var(--text-secondary)";
              }
            }}
          >
            Semua
          </div>

          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                if (onSelect) onSelect(opt);
                setSelectedLabel(opt.label);
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 4,
                cursor: "pointer",
                background: opt.value === value ? "rgba(255, 255, 255, 0.1)" : "transparent",
                color: opt.value === value ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                if (opt.value !== value) {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.05)";
                  (e.currentTarget as HTMLDivElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={e => {
                if (opt.value !== value) {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  (e.currentTarget as HTMLDivElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              {opt.label}
            </div>
          ))}

          {loading && (
            <div style={{ padding: "8px 12px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
              Memuat...
            </div>
          )}

          {cursor && !loading && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadData(false);
              }}
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 4, width: "100%", fontSize: 12 }}
            >
              Muat lebih banyak
            </button>
          )}
        </div>
      )}
    </div>
  );
}
