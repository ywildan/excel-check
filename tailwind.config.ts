import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f6f2ea",
        surface: "#fffcf7",
        "surface-2": "#fbf7ef",
        ink: "#232019",
        muted: "#756e60",
        line: "#e0d7c7",
        "line-strong": "#cfc4b1",
        accent: "#1e5947",
        "accent-hover": "#17493a",
        "accent-soft": "#e9f0eb",
        amber: "#8a5a00",
        "amber-soft": "#f4e9d4",
        danger: "#7a2e27",
        "danger-soft": "#f4e4e0",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Segoe UI", "system-ui", "sans-serif"],
        mono: ["Consolas", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: {
        wrap: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
