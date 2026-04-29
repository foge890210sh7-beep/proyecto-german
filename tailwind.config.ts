import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#f59e0b",
          dark: "#b45309",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
