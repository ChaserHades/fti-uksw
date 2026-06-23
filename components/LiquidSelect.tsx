"use client";
import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface LiquidSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  className?: string;
  style?: React.CSSProperties;
}

export default function LiquidSelect({ value, onChange, options, className = "", style }: LiquidSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

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
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption?.label ?? "Pilih..."}
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
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
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
        </div>
      )}
    </div>
  );
}
