import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "REKASURYA — Pusat Diagnostik & Pemeliharaan PJUTS Solo Raya",
  description:
    "Platform pemantauan kesehatan, lokalisasi komponen gangguan 3-kanal terisolasi, work order suku cadang, dan kalkulator penghematan PJU tenaga surya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased selection:bg-sky-500/30 selection:text-sky-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
