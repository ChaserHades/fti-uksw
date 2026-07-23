"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/helpers/api";

interface Option {
  value: string;
  label: string;
}

interface AsyncAutocompleteProps {
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

export default function AsyncAutocomplete({
  value,
  onChange,
  onSelect,
  fetchUrl,
  placeholder = "Ketik untuk mencari...",
  className = "input",
  style,
  mapOption,
}: AsyncAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  // Local state for the input text (so they can type freely)
  const [inputValue, setInputValue] = useState(value);

  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Sync external value to internal if it changes from outside
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // Ensure what they typed is committed to parent if they click away
        if (inputValue !== value) onChange(inputValue);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [inputValue, value, onChange]);

  const loadData = async (searchStr: string, reset = true) => {
    setLoading(true);
    const currentCursor = reset ? null : cursor;

    // Parse base URL and query params
    const url = new URL(fetchUrl, window.location.origin);
    url.searchParams.set("limit", "5");
    if (searchStr) url.searchParams.set("search", searchStr);
    if (currentCursor) url.searchParams.set("cursor", currentCursor);

    try {
      const res = await api.get<{ data: any[]; nextCursor: string | null }>(url.pathname + url.search);
      const newOptions = res.data.map(mapOption);

      setOptions(prev => reset ? newOptions : [...prev, ...newOptions]);
      setCursor(res.nextCursor);
    } catch (e) {
      console.error("Failed to load options", e);
    } finally {
      setLoading(false);
    }
  };

  // Open dropdown and load initial data when focused
  const handleFocus = () => {
    setOpen(true);
    loadData(inputValue, true);
  };

  // Handle typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // Also update parent immediately so form stays in sync

    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData(val, true);
    }, 300);
  };

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        autoComplete="off"
      />

      {open && (options.length > 0 || loading) && (
        <div
          className="glass"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: 300,
            overflowY: "auto",
            padding: 4,
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            background: "rgba(30, 30, 32, 0.95)",
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          {/* Omitted "entri baru" block so it stays hidden when empty */}

          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                setInputValue(opt.label);
                onChange(opt.label);
                if (onSelect) onSelect(opt);
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 4,
                cursor: "pointer",
                background: "transparent",
                color: "var(--text-secondary)",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.05)";
                (e.currentTarget as HTMLDivElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
                (e.currentTarget as HTMLDivElement).style.color = "var(--text-secondary)";
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
                e.stopPropagation(); // prevent input blur
                loadData(inputValue, false);
              }}
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 4, width: "100%" }}
            >
              Muat lebih banyak
            </button>
          )}
        </div>
      )}
    </div>
  );
}
