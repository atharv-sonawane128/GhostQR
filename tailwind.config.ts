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
        purple: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        ghost: {
          50:  "#f8f7ff",
          100: "#f0eeff",
          200: "#e3dffe",
          300: "#c9c0fd",
          400: "#a99af9",
          500: "#8b74f5",
          600: "#7c55eb",
          700: "#6c3dd4",
          800: "#5a31ae",
          900: "#4a2d8c",
          950: "#2d1a5e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":    "0 1px 3px 0 rgba(124, 58, 237, 0.08), 0 1px 2px -1px rgba(124, 58, 237, 0.06)",
        "card-md": "0 4px 6px -1px rgba(124, 58, 237, 0.10), 0 2px 4px -2px rgba(124, 58, 237, 0.06)",
        "card-lg": "0 10px 15px -3px rgba(124, 58, 237, 0.12), 0 4px 6px -4px rgba(124, 58, 237, 0.08)",
        "glow":    "0 0 20px rgba(124, 58, 237, 0.25)",
      },
      borderRadius: {
        "xl":  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-in-out",
        "slide-in":   "slideIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
