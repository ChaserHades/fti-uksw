"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { initials } from "@/helpers/format";
import { useState } from "react";

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <div className="topbar-logo">A</div>
        <div>
          <div className="topbar-brand-name">Aset FTI</div>
          <div className="topbar-brand-role">{role}</div>
        </div>
      </div>

      {/* Nav - desktop */}
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
        {/* User info */}
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

        {/* Logout */}
        <form action={logoutAction}>
          <button type="submit" className="topbar-logout" title="Logout">
            <i className="ti ti-logout" />
          </button>
        </form>

        {/* Mobile hamburger */}
        <button className="topbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="topbar-mobile-menu">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-mobile-item ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 6, paddingTop: 6 }}>
            <form action={logoutAction}>
              <button type="submit" className="topbar-mobile-item" style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}>
                <i className="ti ti-logout" /> Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}