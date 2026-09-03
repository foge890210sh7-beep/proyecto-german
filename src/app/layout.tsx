import type { Metadata } from "next";
import { Kalam } from "next/font/google";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={kalam.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
