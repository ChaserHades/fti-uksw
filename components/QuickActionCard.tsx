import Link from "next/link";
import React from "react";

interface QuickActionCardProps {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  className?: string;
}

export default function QuickActionCard({ href, icon, title, subtitle, className = "" }: QuickActionCardProps) {
  return (
    <Link href={href} className={`qa-card ${className}`}>
      <div className="qa-card-icon">
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div className="qa-card-title">{title}</div>
        <div className="qa-card-sub">{subtitle}</div>
      </div>
    </Link>
  );
}
