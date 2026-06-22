"use client";

import React, { ReactNode } from "react";
import LiquidGlass from "liquid-glass-react";

interface LiquidWrapperProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  cornerRadius?: number;
  onClick?: () => void;
  // Specific prop to make it act like a card or a button
  isInteractive?: boolean;
}

export default function LiquidWrapper({
  children,
  className = "",
  padding = "24px",
  cornerRadius = 14,
  onClick,
  isInteractive = false,
}: LiquidWrapperProps) {
  return (
    <LiquidGlass
      className={className}
      displacementScale={isInteractive ? 80 : 40} // More displacement on interactive elements
      blurAmount={0.08}
      saturation={120}
      aberrationIntensity={1}
      elasticity={isInteractive ? 0.4 : 0.15} // More elastic if interactive
      cornerRadius={cornerRadius}
      padding={padding}
      onClick={onClick}
      // Set to false for Dark Mode
      overLight={false} 
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      {children}
    </LiquidGlass>
  );
}
