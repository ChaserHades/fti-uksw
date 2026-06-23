"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface IslandAction {
  id: string;
  href: string;
  icon: string;
  label: string;
  color: string;
}

export default function DynamicIsland({ actions }: { actions: IslandAction[] }) {
  return (
    <div className="dynamic-island-wrapper">
      <div className="dynamic-island glass">
        {actions.map(action => (
          <Link key={action.id} href={action.href} className="island-btn">
            <div className="island-icon" style={{ color: action.color }}>
              <i className={`ti ${action.icon}`} />
            </div>
            <span className="island-label">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
