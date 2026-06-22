import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";

interface QuickActionCardProps {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  className?: string;
}

export default function QuickActionCard({ href, icon, title, subtitle, className = "" }: QuickActionCardProps) {
  const router = useRouter();
  
  return (
    <div
      className={`glass qa-card ${className}`}
      onClick={() => router.push(href)}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "16px", padding: "20px", height: "100%", width: "100%" }}
    >
      <div className="qa-card-icon">
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div className="qa-card-title">{title}</div>
        <div className="qa-card-sub">{subtitle}</div>
      </div>
    </div>
  );
}
