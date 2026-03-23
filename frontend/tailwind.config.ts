import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Cormorant Garamond", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        board: {
          felt: "hsl(var(--board-felt))",
          frame: "hsl(var(--board-frame))",
          "frame-highlight": "hsl(var(--board-frame-highlight))",
        },
        triangle: {
          dark: "hsl(var(--triangle-dark))",
          light: "hsl(var(--triangle-light))",
        },
        bar: "hsl(var(--bar-color))",
        checker: {
          light: "hsl(var(--checker-light))",
          "light-stroke": "hsl(var(--checker-light-stroke))",
          dark: "hsl(var(--checker-dark))",
          "dark-stroke": "hsl(var(--checker-dark-stroke))",
          selected: "hsl(var(--checker-selected))",
        },
        dice: {
          face: "hsl(var(--dice-face))",
          pip: "hsl(var(--dice-pip))",
          used: "hsl(var(--dice-used))",
        },
        cube: {
          face: "hsl(var(--cube-face))",
          foreground: "hsl(var(--cube-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px 2px hsl(var(--checker-selected) / 0.6)" },
          "50%": { boxShadow: "0 0 16px 6px hsl(var(--checker-selected) / 0.9)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
