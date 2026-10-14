import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0F5B59", dark: "#0A3D3B" },
        accent: "#F08A2E",
        secondary: "#C75B3A",
        highlight: "#E7C36C",
        background: "#F5F7F9",
        surface: "#FFFFFF",
        foreground: "#1E2933",
        muted: "#6B7280",
        outline: "#DFE5EA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
