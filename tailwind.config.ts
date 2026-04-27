import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "rgb(var(--color-void-900) / <alpha-value>)",
          900: "rgb(var(--color-void-900) / <alpha-value>)",
          800: "rgb(var(--color-void-800) / <alpha-value>)",
          700: "rgb(var(--color-void-700) / <alpha-value>)",
          600: "rgb(var(--color-void-600) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "rgb(var(--color-cyan) / <alpha-value>)",
          glow: "rgb(var(--color-cyan) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--color-amber) / <alpha-value>)",
        },
        mute: {
          100: "rgb(var(--color-mute-100) / <alpha-value>)",
          300: "rgb(var(--color-mute-300) / <alpha-value>)",
          500: "rgb(var(--color-mute-500) / <alpha-value>)",
          700: "rgb(var(--color-mute-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgb(var(--color-cyan) / 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
