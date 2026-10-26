import { headers } from "next/headers";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import "./elares.css";
import "./themes.css";
import "./product.css";
import PageScrollReset from "@/components/PageScrollReset";
import ThemeProvider from "@/components/ThemeProvider";
import { themeBootstrap } from "@/lib/theme";
export const metadata: Metadata = {
  title: "Elares Barber — Gestão de barbearias",
  description: "Sua agenda organizada. Seu negócio em boas mãos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Elares Barber",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/elares-192.png?v=gold",
    apple: "/icons/elares-180.png?v=gold",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101317",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body>
        <ThemeProvider>
          <PageScrollReset />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
