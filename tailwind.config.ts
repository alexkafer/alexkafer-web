import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#050510",
          900: "#050510",
          800: "#0a0e1a",
          700: "#0f1623",
          600: "#141c2e",
        },
        cyan: {
          DEFAULT: "#7dd3fc",
          glow: "#7dd3fc",
        },
        amber: {
          DEFAULT: "#fbbf24",
        },
        mute: {
          100: "#e6edf3",
          300: "#9ca3af",
          500: "#6b7280",
          700: "#374151",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(125,211,252,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
