import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // pdfkit/fontkit cargan archivos .afm/.ttf desde disco; hay que incluirlos
  // explícitamente en el bundle de las Serverless Functions de Vercel.
  outputFileTracingIncludes: {
    "/api/reportes/**": ["./node_modules/pdfkit/**/*.afm"],
  },
};

export default config;
