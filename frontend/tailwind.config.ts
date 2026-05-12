import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ocean: {
          900: "#0a3558",
          800: "#0f4c81",
          700: "#1e5fa8",
          600: "#2563eb",
        },
        lagoon: {
          500: "#0e9f6e",
          600: "#0d8a5f",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
