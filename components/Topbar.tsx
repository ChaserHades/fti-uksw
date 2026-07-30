// components/Topbar.tsx
"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { initials } from "@/helpers/format";
import { useState, useEffect, useRef, useCallback } from "react";

export interface NavItem { href: string; label: string; icon: string; }

interface TopbarProps {
  items: NavItem[];
  role:  string;
  userName?:  string;
  userEmail?: string;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",        icon: "ti-layout-dashboard" },
  { href: "/admin/barang",     label: "Barang",           icon: "ti-box" },
  { href: "/admin/ruangan",    label: "Ruangan",          icon: "ti-building" },
  { href: "/admin/pinjam",     label: "Pinjam",           icon: "ti-qrcode" },
  { href: "/admin/riwayat",    label: "Riwayat",          icon: "ti-history" },
  { href: "/admin/laporan",    label: "Laporan",          icon: "ti-file-description" },
  { href: "/admin/tim",        label: "Tim & Verifikasi", icon: "ti-users" },
];

export const TEKNISI_NAV: NavItem[] = [
  { href: "/petugas/dashboard",  label: "Dashboard",       icon: "ti-layout-dashboard" },
  { href: "/petugas/pinjam",     label: "Pinjam",          icon: "ti-arrow-bar-to-down" },
  { href: "/petugas/ruangan",    label: "Ruangan",         icon: "ti-building" },
  { href: "/petugas/listbarang", label: "List Barang",     icon: "ti-list" },
  { href: "/petugas/riwayat",    label: "Riwayat",         icon: "ti-history" },
];

export const UNIVERSITAS_NAV: NavItem[] = [
  { href: "/universitas/dashboard", label: "Dashboard",  icon: "ti-layout-dashboard" },
  { href: "/universitas/barang",    label: "Barang",     icon: "ti-box" },
  { href: "/universitas/peminjaman", label: "Peminjaman",  icon: "ti-arrows-exchange" },
  { href: "/universitas/pembelian", label: "Pembelian",  icon: "ti-receipt" },
];

export default function Topbar({ items, role, userName }: TopbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open,    setOpen]    = useState(false);
  const [compact, setCompact] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerRef  = useRef<HTMLElement>(null);
  const ghostRef   = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);


  // overflow detection (toggle .topbar-compact class)
  const checkOverflow = useCallback(() => {
    const header  = headerRef.current;
    const ghost   = ghostRef.current;
    const actions = actionsRef.current;
    if (!header || !ghost || !actions) return;

    const cs      = getComputedStyle(header);
    const padH    = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const gap     = parseFloat(cs.gap) || 8;
    const avail   = header.clientWidth - padH;

    const brand   = header.children[0] as HTMLElement;
    const brandW  = brand?.offsetWidth ?? 0;
    const actW    = actions.offsetWidth;
    const navW    = ghost.scrollWidth; // ghost has no flex constraint (natural width)

    setCompact(brandW + gap + navW + gap + actW > avail + 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [checkOverflow, items]);

  useEffect(() => { setOpen(false); }, [pathname]);

  // Scroll logic for Topbar visual animation and hide/show
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Scrolled state for background styling
          setIsScrolled(currentScrollY > 20);
          
          // Hide/Show logic based on scroll direction
          if (currentScrollY > lastScrollY && currentScrollY > 80) {
            // Scrolling down
            setIsHidden(true);
            setOpen(false); // Close dropdown if it's open
          } else if (currentScrollY < lastScrollY) {
            // Scrolling up
            setIsHidden(false);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {

    if (href.includes("?")) {
      const [path, query] = href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      const tab = params.get("tab");
      return tab ? searchParams.get("tab") === tab : false;
    }
    // Strict exact match for dashboard or fallback
    return pathname === href;
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (compact) setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 250); // 250ms debounce
  };

  return (
    <div className="topbar-wrapper" onMouseLeave={handleMouseLeave}>
      <header 
        ref={headerRef} 
        className={`topbar${compact ? " topbar-compact" : ""}${isScrolled ? " topbar-scrolled" : ""}`}
        data-hidden={String(isHidden)}
      >

        {/* Brand */}
        <div className="topbar-brand">
          <div className="topbar-logo" style={{ background: "transparent", padding: 0 }}>
            <img 
              src={role === "UNIVERSITAS" ? "/logo/UKSW%20NO%20BG.png" : "/logo/FTI%20no%20bg.png"} 
              alt={`Logo ${role}`} 
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div className="topbar-brand-text">
            <div className="topbar-brand-name">Aset FTI</div>
            <div className="topbar-brand-role">{role}</div>
          </div>
        </div>

        {/* Visible nav (hidden by CSS when .topbar-compact) */}
        <nav className="topbar-nav" aria-hidden={compact}>
          {items.map(item => (
            <Link
              key={item.href} href={item.href}
              className={`topbar-nav-item ${isActive(item.href) ? "active" : ""}`}
              tabIndex={compact ? -1 : 0}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Ghost nav: always in DOM at natural width, invisible (for measurement) */}
        <div
          ref={ghostRef}
          aria-hidden
          style={{
            position: "absolute", visibility: "hidden", pointerEvents: "none",
            display: "flex", gap: 2, whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {items.map(item => (
            <span key={item.href} className="topbar-nav-item">
              <i className={`ti ${item.icon}`} />{item.label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div ref={actionsRef} className="topbar-actions">
          {/* user info (hidden by CSS in compact) */}
          <div className="topbar-user-info">
            <div className="topbar-user-text">
              <span className="topbar-user-name">{userName ?? "User"}</span>
              <span className="topbar-user-role">{role}</span>
            </div>
            <div className="topbar-avatar">{initials(userName)}</div>
          </div>

          {/* logout (hidden by CSS in compact) */}
          <form action={logoutAction} className="topbar-logout-form">
            <button type="submit" className="topbar-logout" title="Logout">
              <i className="ti ti-logout" />
            </button>
          </form>

          {/* hamburger (shown by CSS in compact) */}
          <button
            className="topbar-hamburger"
            onMouseEnter={handleMouseEnter}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
          >
            <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
          </button>
        </div>
      </header>

      {/* Dropdown (CSS class controls display, data-hidden controls transform) */}
      <div
        className="topbar-dropdown"
        data-hidden={String(!open || !compact)}
        role="navigation"
        aria-label="Menu navigasi"
        onMouseEnter={handleMouseEnter}
      >
        {items.map(item => (
          <Link
            key={item.href} href={item.href}
            className={`topbar-dropdown-item ${isActive(item.href) ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <i className={`ti ${item.icon}`} />
            {item.label}
          </Link>
        ))}

        <div className="topbar-dropdown-sep" />

        {/* User info in dropdown */}
        <div className="topbar-dropdown-user">
          <div className="topbar-avatar">{initials(userName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="topbar-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName ?? "User"}
            </div>
            <div className="topbar-user-role">{role}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="topbar-dropdown-logout" title="Logout">
              <i className="ti ti-logout" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}