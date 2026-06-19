/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f5fa",
          100: "#dde7f1",
          200: "#b6cde0",
          300: "#89adc9",
          400: "#5d8ab1",
          500: "#3d6d9a",
          600: "#2d557d",
          700: "#1e3a5f",
          800: "#182f4c",
          900: "#112238",
          950: "#0a1524",
        },
        gold: {
          50: "#fdfaf0",
          100: "#faf2d6",
          200: "#f5e4ad",
          300: "#edd17a",
          400: "#e4bb4d",
          500: "#d4af37",
          600: "#b8942a",
          700: "#937123",
          800: "#775a21",
          900: "#634a1f",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['Inter', '"Noto Sans SC"', "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 10px 40px -5px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "scan-line": "scanLine 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        scanLine: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(100%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
