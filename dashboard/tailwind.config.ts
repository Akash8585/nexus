import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5",
          soft: "#eef2ff",
          strong: "#3730a3",
        },
        status: {
          active: "#16a34a",
          idle: "#6b7280",
          dead: "#dc2626",
        },
        topic: {
          research: "#14b8a6",
          analysis: "#8b5cf6",
          writing: "#f59e0b",
          delivery: "#f87171",
        },
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
