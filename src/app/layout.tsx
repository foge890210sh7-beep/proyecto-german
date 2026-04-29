import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin German — Reparación de autopistas",
  description: "Control administrativo: reportes diarios, gastos, fotos y cobros.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
