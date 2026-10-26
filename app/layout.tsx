import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Navalha — Gestão de barbearias",
  description: "Sua agenda organizada. Seu negócio em boas mãos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Navalha", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#193f34",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
