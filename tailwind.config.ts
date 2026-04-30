import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#facc15",   // amarillo vivo
          dark: "#eab308",
          red: "#ef4444",
          "red-dark": "#b91c1c",
          blue: "#2563eb",
          "blue-dark": "#1e3a8a",
          ink: "#0b1220",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(.94)" },
          "70%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "shine": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(250, 204, 21, .55)" },
          "70%": { boxShadow: "0 0 0 14px rgba(250, 204, 21, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(250, 204, 21, 0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-up": "fade-up .55s cubic-bezier(.2,.8,.2,1) both",
        "pop-in": "pop-in .5s cubic-bezier(.2,.8,.2,1) both",
        "shine": "shine 2.4s linear infinite",
        "gradient-pan": "gradient-pan 14s ease infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(.4,0,.6,1) infinite",
        "float": "float 3.5s ease-in-out infinite",
      },
      boxShadow: {
        "glow-yellow": "0 0 24px rgba(250, 204, 21, .45)",
        "glow-red": "0 0 24px rgba(239, 68, 68, .45)",
        "glow-blue": "0 0 24px rgba(37, 99, 235, .45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
