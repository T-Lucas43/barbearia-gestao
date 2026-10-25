import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Navalha — Gestão de barbearias",
  description: "Sua agenda organizada. Seu negócio em boas mãos.",
  manifest: "/manifest.webmanifest",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
