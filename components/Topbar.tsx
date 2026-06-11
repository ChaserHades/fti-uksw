"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { initials } from "@/helpers/format";
import { useState, useEffect, useRef, useCallback } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface TopbarProps {
  items: NavItem[];
  role: string;
  userName?: string;
  userEmail?: string;
}

// ─── Nav configs per role ─────────────────────────────────────────────────────
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",  icon: "ti-layout-dashboard" },
  { href: "/admin/barang",     label: "Barang",     icon: "ti-box" },
  { href: "/admin/kategori",   label: "Kategori",   icon: "ti-category" },
  { href: "/admin/ruangan",    label: "Ruangan",    icon: "ti-door" },
  { href: "/admin/transaksi",  label: "Transaksi",  icon: "ti-arrows-exchange" },
  { href: "/admin/verifikasi", label: "Verifikasi", icon: "ti-user-check" },
  { href: "/admin/petugas",    label: "Petugas",    icon: "ti-users" },
];

export const PETUGAS_NAV: NavItem[] = [
  { href: "/petugas/dashboard",  label: "Dashboard",   icon: "ti-layout-dashboard" },
  { href: "/petugas/pinjam",     label: "Pinjam",      icon: "ti-arrow-bar-to-down" },
  { href: "/petugas/kembali",    label: "Kembali",     icon: "ti-arrow-bar-to-up" },
  { href: "/petugas/listbarang", label: "List Barang", icon: "ti-list" },
  { href: "/petugas/riwayat",    label: "Riwayat",     icon: "ti-history" },
];

export const UNIVERSITAS_NAV: NavItem[] = [
  { href: "/universitas/dashboard", label: "Dashboard",  icon: "ti-layout-dashboard" },
  { href: "/universitas/barang",    label: "Barang",     icon: "ti-box" },
  { href: "/universitas/transaksi", label: "Transaksi",  icon: "ti-arrows-exchange" },
  { href: "/universitas/pembelian", label: "Pembelian",  icon: "ti-receipt" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Topbar({ items, role, userName }: TopbarProps) {
  const pathname  = usePathname();
  const [open, setOpen]       = useState(false);
  const [visible, setVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const lastY     = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const navRef    = useRef<HTMLDivElement>(null); // ghost nav for measurement

  // ── Content-aware overflow detection ──────────────────────────────────────
  // We keep a hidden "ghost" nav that always has its natural width.
  // If ghost.offsetWidth + brand + actions > header.clientWidth → compact.
  const checkOverflow = useCallback(() => {
    const header = headerRef.current;
    const ghost  = navRef.current;
    if (!header || !ghost) return;

    const cs       = getComputedStyle(header);
    const gap      = parseFloat(cs.gap) || 8;
    const padH     = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const available = header.clientWidth - padH;

    // Brand: first child
    const brand  = header.children[0] as HTMLElement | null;
    const brandW = brand?.offsetWidth ?? 0;

    // Actions: last child
    const actions  = header.children[header.children.length - 1] as HTMLElement | null;
    const actionsW = actions?.offsetWidth ?? 0;

    // Ghost nav has no flex constraints — its offsetWidth = natural width
    const navW = ghost.offsetWidth;

    const needed = brandW + gap + navW + gap + actionsW;
    setCompact(needed > available + 1); // +1 subpixel tolerance
  }, []);

  useEffect(() => {
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [checkOverflow, items]);

  // ── Hide-on-scroll-down ────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 60) { setVisible(true); return; }
      setVisible(y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  const slideY   = visible ? "translateY(0)" : "translateY(calc(-100% - 16px))";
  const transition = "transform .3s cubic-bezier(.4,0,.2,1)";

  // ── Inline styles that override CSS display:none from globals.css ─────────
  // globals.css uses .topbar-hamburger { display:none } and only shows it via
  // @media (max-width:768px). We bypass that with inline style so JS controls
  // visibility regardless of viewport width.
  const hamburgerStyle: React.CSSProperties = {
    display:         compact ? "flex" : "none",
    width:           32,
    height:          32,
    borderRadius:    "var(--r-sm)",
    background:      "var(--glass-bg)",
    border:          "1px solid var(--glass-border)",
    alignItems:      "center",
    justifyContent:  "center",
    color:           "var(--text-secondary)",
    fontSize:        17,
    cursor:          "pointer",
    flexShrink:      0,
  };

  const mobileMenuStyle: React.CSSProperties = {
    display:          compact && open ? "flex" : "none",
    position:         "fixed",
    top:              "calc(var(--topbar-h) + 12px + 6px)",
    left:             24,
    right:            24,
    margin:           "0 auto",
    maxWidth:         1400,
    background:       "rgba(13,27,42,0.96)",
    border:           "1px solid var(--glass-border)",
    borderRadius:     "var(--r-md)",
    padding:          "10px 16px 14px",
    backdropFilter:   "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    zIndex:           49,
    flexDirection:    "column",
    gap:              2,
    transform:        slideY,
    transition,
  };

  return (
    <>
      <header
        ref={headerRef}
        className="topbar"
        style={{ transform: slideY, transition }}
      >
        {/* Brand — flex-shrink:0 always */}
        <div className="topbar-brand">
          <div className="topbar-logo">A</div>
          <div>
            <div className="topbar-brand-name">Aset FTI</div>
            <div className="topbar-brand-role">{role}</div>
          </div>
        </div>

        {/* Visible nav — hidden via inline style when compact */}
        <nav
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           2,
            flex:          compact ? "0 0 0px" : "1",
            overflow:      "hidden",
            visibility:    compact ? "hidden" : "visible",
            pointerEvents: compact ? "none" : "auto",
          }}
          aria-hidden={compact}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-nav-item ${isActive(item.href) ? "active" : ""}`}
              tabIndex={compact ? -1 : 0}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Ghost nav — always in flow, no flex-shrink, invisible to user.
            Used purely for measuring natural nav width. */}
        <div
          ref={navRef}
          aria-hidden
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            2,
            position:       "absolute",
            visibility:     "hidden",
            pointerEvents:  "none",
            whiteSpace:     "nowrap",
            flexShrink:     0,
          }}
        >
          {items.map((item) => (
            <span key={item.href} className="topbar-nav-item">
              <i className={`ti ${item.icon}`} />
              {item.label}
            </span>
          ))}
        </div>

        {/* Actions — flex-shrink:0, never wraps */}
        <div
          className="topbar-actions"
          style={{ flexShrink: 0, marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}
        >
          {/* User info: only in desktop mode */}
          {!compact && (
            <div className="topbar-user-info">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {userName ?? "User"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {role}
                </div>
              </div>
              <div className="topbar-avatar">{initials(userName)}</div>
            </div>
          )}

          {/* Avatar only in compact */}
          {compact && (
            <div className="topbar-avatar" style={{ flexShrink: 0 }}>
              {initials(userName)}
            </div>
          )}

          <form action={logoutAction}>
            <button type="submit" className="topbar-logout" title="Logout">
              <i className="ti ti-logout" />
            </button>
          </form>

          {/* Hamburger — inline style overrides globals.css display:none */}
          <button
            style={hamburgerStyle}
            onClick={() => setOpen(p => !p)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
          >
            <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
          </button>
        </div>
      </header>

      {/* Mobile dropdown — inline style overrides globals.css display:none */}
      <div style={mobileMenuStyle} role="navigation" aria-label="Menu navigasi">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`topbar-mobile-item ${isActive(item.href) ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <i className={`ti ${item.icon}`} />
            {item.label}
          </Link>
        ))}

        {/* User info + logout di bottom dropdown */}
        <div style={{
          borderTop: "1px solid var(--glass-border)",
          marginTop: 6, paddingTop: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div className="topbar-avatar" style={{ flexShrink: 0 }}>{initials(userName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName ?? "User"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {role}
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="topbar-logout" title="Logout" style={{ flexShrink: 0 }}>
              <i className="ti ti-logout" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}