import React from "react";

export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#DCE3EC] pb-4">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#062D5B] leading-tight">
            {title}
          </h1>
          {meta}
        </div>
        {subtitle && (
          <p className="text-[13px] text-[#5B6B7F] max-w-3xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export interface StatusStripItem {
  id: string;
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "normal" | "warning" | "critical" | "accent";
  onClick?: () => void;
  active?: boolean;
}

const TONE_VALUE_CLASS: Record<NonNullable<StatusStripItem["tone"]>, string> = {
  default: "text-[#0B192C]",
  normal: "text-[#15803D]",
  warning: "text-[#B45309]",
  critical: "text-[#B91C1C]",
  accent: "text-[#062D5B]",
};

export function CompactStatusStrip({ items }: { items: StatusStripItem[] }) {
  return (
    <div className="ops-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE3EC]">
        {items.map((item) => {
          const valClass = TONE_VALUE_CLASS[item.tone ?? "default"];
          const content = (
            <div className="px-4 py-3 flex flex-col gap-0.5 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                {item.label}
              </div>
              <div className={`text-[20px] font-semibold font-mono tabular-nums leading-snug ${valClass}`}>
                {item.value}
              </div>
              {item.detail && (
                <div className="text-[11px] text-[#5B6B7F] truncate">{item.detail}</div>
              )}
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`transition-colors cursor-pointer hover:bg-[#F3F6FA] ${
                  item.active ? "bg-[#FFF8E7] ring-1 ring-inset ring-[#FEB124]" : ""
                }`}
              >
                {content}
              </button>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Memuat antarmuka operasional">
      <div className="h-14 rounded-lg bg-[#FFFFFF] border border-[#DCE3EC]" />
      <div className="h-20 rounded-lg bg-[#FFFFFF] border border-[#DCE3EC]" />
      <div className="ops-card p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-[#EDF1F6]" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ops-inset px-6 py-10 text-center space-y-2">
      <div className="text-sm font-semibold text-[#062D5B]">{title}</div>
      <p className="text-xs text-[#5B6B7F] max-w-md mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
