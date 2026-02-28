import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0A0A0B",
        surface: {
          DEFAULT: "#111113",
          secondary: "#18181B",
          tertiary: "#1F1F24",
        },
        border: {
          DEFAULT: "#27272A",
        },
        text: {
          primary: "#FAFAFA",
          secondary: "#A1A1AA",
          muted: "#71717A",
        },
        accent: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          light: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
