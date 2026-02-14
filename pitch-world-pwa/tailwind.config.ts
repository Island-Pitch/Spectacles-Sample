import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ip: {
          black: "#030400",
          orange: "#ff8f05",
          white: "#f7f7fc",
          dark: "#333333",
          brown: "#31210d",
        },
      },
      fontFamily: {
        sans: ["Cabin", "system-ui", "sans-serif"],
        sketch: ["Cabin Sketch", "cursive"],
        condensed: ["Cabin Condensed", "sans-serif"],
      },
      borderRadius: {
        ip: "10px",
      },
      boxShadow: {
        ip: "0 5px 20px rgba(0,0,0,0.25)",
        "ip-soft": "0px 4px 12px rgba(0,0,0,0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ripple: "ripple 1.5s ease-out infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
