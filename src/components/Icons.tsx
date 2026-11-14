import React from "react";

interface IconProps {
  className?: string;
}

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function OverviewIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function DevicesIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" />
    </svg>
  );
}

export function DiagnosticsIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </svg>
  );
}

export function AlertsIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function WorkOrdersIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function MapIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

export function EnergyIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function SimulatorIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M9 3h6M10 3v5l-5.2 9.4A2 2 0 0 0 6.5 20h11a2 2 0 0 0 1.7-2.6L14 8V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

export function ArchitectureIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

export function MenuIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SearchIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function RefreshIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg {...baseProps} className={className} aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
