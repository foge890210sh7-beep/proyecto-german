import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // pdfkit y exceljs son librerias CJS que hacen require dinamico de archivos
  // (fuentes AFM, workers). Si Next las empaqueta con webpack se rompen en
  // Vercel serverless. Con serverExternalPackages las deja como CJS nativos.
  serverExternalPackages: ["pdfkit", "fontkit", "exceljs"],
  // Y ademas nos aseguramos que los .afm y .ttf viajen al bundle:
  outputFileTracingIncludes: {
    "/api/reportes/**": [
      "./node_modules/pdfkit/**/*.afm",
      "./node_modules/pdfkit/js/data/**",
    ],
  },
};

export default config;
