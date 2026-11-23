import type { Metadata, Viewport } from "next";
import { Kalam } from "next/font/google";
import InstallGate from "@/components/InstallGate";
import "./globals.css";

// Fuente handwriting para la hoja de cuaderno (/notas)
const kalam = Kalam({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Administración Saladino — Reparación de autopistas",
  description: "Control administrativo: reportes diarios, gastos, fotos y cobros.",
  applicationName: "Saladino",
  icons: {
    icon: [{ url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Saladino", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Administración Saladino",
    description: "Control administrativo: reportes diarios, gastos, fotos y cobros.",
    images: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={kalam.variable}>
      <body className="min-h-screen antialiased">
        {children}
        <InstallGate />
      </body>
    </html>
  );
}
