"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { initials } from "@/helpers/format";
import { useState, useEffect, useRef } from "react";

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

export default function Topbar({ items, role, userName, userEmail }: TopbarProps) {
  const pathname   = usePathname();
  const [open, setOpen]       = useState(false);
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  // Hide-on-scroll-down, show-on-scroll-up
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

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      <header
        className="topbar"
        style={{
          transform: visible ? "translateY(0)" : "translateY(calc(-100% - 16px))",
          transition: "transform .3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Brand */}
        <div className="topbar-brand">
          <div className="topbar-logo">A</div>
          <div>
            <div className="topbar-brand-name">Aset FTI</div>
            <div className="topbar-brand-role">{role}</div>
          </div>
        </div>

        {/* Nav desktop */}
        <nav className="topbar-nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-nav-item ${isActive(item.href) ? "active" : ""}`}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="topbar-actions">
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

          <form action={logoutAction}>
            <button type="submit" className="topbar-logout" title="Logout">
              <i className="ti ti-logout" />
            </button>
          </form>

          {/* Hamburger mobile */}
          <button
            className="topbar-hamburger"
            onClick={() => setOpen(p => !p)}
            aria-label="Menu"
          >
            <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="topbar-mobile-menu"
          style={{
            transform: visible ? "translateY(0)" : "translateY(calc(-100% - 200px))",
            transition: "transform .3s cubic-bezier(.4,0,.2,1)",
          }}
        >
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
          <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 6, paddingTop: 6 }}>
            <form action={logoutAction}>
              <button
                type="submit"
                className="topbar-mobile-item"
                style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
              >
                <i className="ti ti-logout" /> Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}