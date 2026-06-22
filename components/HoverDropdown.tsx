"use client";
import { useState, useRef, ReactNode } from "react";

interface HoverDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  menuClassName?: string;
}

export default function HoverDropdown({ 
  trigger, 
  children, 
  align = "left", 
  className = "",
  menuClassName = ""
}: HoverDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 250); // 250ms debounce
  };

  // Resolve alignment classes
  let alignClass = "left-0";
  if (align === "right") alignClass = "right-0";
  if (align === "center") alignClass = "left-1/2 -translate-x-1/2";

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div>{trigger}</div>
      
      {open && (
        <div 
          className={`absolute z-50 mt-2 min-w-[200px] glass p-2 ${alignClass} ${menuClassName}`}
          style={{ animation: "slideUp 0.2s ease" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
