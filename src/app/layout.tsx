import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const inter = Inter({
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
  title: "REKASURYA — Platform Diagnosis, Pemeliharaan & Pengelolaan Energi PJUTS",
  description:
    "Platform monitoring dan diagnosis komponen PJU tenaga surya 3-kanal terisolasi: deteksi gangguan F1–F6, work order berbasis suku cadang, peta Solo Raya, dan kalkulator PBJT-TL.",
  icons: {
    icon: "/rekasurya-mark-on-light.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-[#F4F6F9] text-[#0B192C] selection:bg-[#FFD585] selection:text-[#062D5B]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
