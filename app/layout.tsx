import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import "./elares.css";
import PageScrollReset from "@/components/PageScrollReset";
export const metadata: Metadata = {
  title: "Elares Barber — Gestão de barbearias",
  description: "Sua agenda organizada. Seu negócio em boas mãos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Elares Barber",
    statusBarStyle: "default",
  },
  icons: { icon: "/icons/elares-192.png", apple: "/icons/elares-180.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101317",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PageScrollReset />
        {children}
      </body>
    </html>
  );
}
