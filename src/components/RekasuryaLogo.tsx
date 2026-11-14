import React from "react";

export interface RekasuryaLogoProps {
  /** Gunakan "on-dark" di atas permukaan Navy (#062D5B) atau "on-light" di atas permukaan terang. */
  variant?: "on-dark" | "on-light";
  /** "full" menampilkan emblem + wordmark resmi; "mark" menampilkan emblem saja. */
  mode?: "full" | "mark";
  /** Tinggi visual logo dalam piksel; lebar mengikuti rasio aspek asli tanpa peregangan. */
  height?: number;
  className?: string;
}

export function RekasuryaLogo({
  variant = "on-light",
  mode = "full",
  height = 36,
  className = "",
}: RekasuryaLogoProps) {
  const src =
    mode === "full"
      ? variant === "on-dark"
        ? "/rekasurya-logo-on-dark.png"
        : "/rekasurya-logo-on-light.png"
      : variant === "on-dark"
      ? "/rekasurya-mark-on-dark.png"
      : "/rekasurya-mark-on-light.png";

  const width =
    mode === "full" ? Math.round((height * 1107) / 567) : Math.round((height * 565) / 405);

  return (
    <img
      src={src}
      alt="Logo REKASURYA"
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      className={`block shrink-0 object-contain select-none ${className}`}
    />
  );
}
