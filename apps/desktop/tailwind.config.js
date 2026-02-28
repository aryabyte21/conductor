/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0B",
        "surface-1": "#111113",
        "surface-2": "#18181B",
        "surface-3": "#1F1F24",
        border: "#27272A",
        "border-focus": "#3F3F46",
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-muted": "#71717A",
        accent: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          foreground: "#FAFAFA",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "Fira Code", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 200ms ease",
        "slide-out-right": "slide-out-right 200ms ease",
        "fade-in": "fade-in 150ms ease",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
