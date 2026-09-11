import type { Config } from "tailwindcss";

/**
 * Design tokens live here and in globals.css as CSS variables.
 * Components reference semantic names (surface, ink, brand) — never raw hex —
 * so the whole platform can be re-themed/re-branded from one place.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff", 100: "#dae5ff", 200: "#bdd0ff", 300: "#90aeff",
          400: "#5c82fb", 500: "#3559f0", 600: "#213ade", 700: "#1b2eb3",
          800: "#1b2a8d", 900: "#1c2a70", 950: "#141b45",
        },
        accent: {
          50: "#fff5ed", 100: "#ffe8d4", 200: "#ffcda8", 300: "#ffa970",
          400: "#ff7a36", 500: "#ff5710", 600: "#f03c06", 700: "#c72b07",
          800: "#9e240e", 900: "#7f210f",
        },
        ink: {
          DEFAULT: "#0d1117", muted: "#5b6472",
          // Darkened from #8a93a1. Small de-emphasised text was already only
          // 3.10:1 on plain white, and the page now has a visible backdrop
          // behind it — over a glyph that fell to 2.39:1, below the 3:1 floor
          // for any text at all. #717b89 keeps the same blue-grey cast and
          // reads 4.29:1 on white, 3.30:1 at the worst point of the backdrop.
          subtle: "#717b89",
          inverse: "#ffffff",
        },
        surface: {
          DEFAULT: "#ffffff", muted: "#f7f8fa", sunken: "#eef0f4", dark: "#0d1117",
        },
        line: { DEFAULT: "#e6e8ee", strong: "#d3d7e0" },
        success: { 50: "#ecfdf3", 500: "#12b76a", 700: "#027a48" },
        warn: { 50: "#fffaeb", 500: "#f79009", 700: "#b54708" },
        danger: { 50: "#fef3f2", 500: "#f04438", 700: "#b42318" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem", "3xl": "1.5rem", "4xl": "2rem" },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(16 24 40 / 0.05)",
        sm: "0 1px 3px 0 rgb(16 24 40 / 0.10), 0 1px 2px -1px rgb(16 24 40 / 0.06)",
        md: "0 4px 8px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06)",
        lg: "0 12px 16px -4px rgb(16 24 40 / 0.08), 0 4px 6px -2px rgb(16 24 40 / 0.03)",
        xl: "0 20px 24px -4px rgb(16 24 40 / 0.08), 0 8px 8px -4px rgb(16 24 40 / 0.03)",
        glow: "0 0 0 1px rgb(53 89 240 / 0.14), 0 8px 30px -6px rgb(53 89 240 / 0.28)",
        // Stacked, tightening shadows. Real objects cast light at several
        // distances at once; one large blur just looks like a grey halo.
        lift: "0 1px 2px rgb(16 24 40 / 0.04), 0 4px 8px -2px rgb(16 24 40 / 0.06), 0 16px 24px -8px rgb(16 24 40 / 0.10)",
        "lift-lg":
          "0 1px 2px rgb(16 24 40 / 0.04), 0 8px 16px -4px rgb(16 24 40 / 0.08), 0 28px 44px -12px rgb(16 24 40 / 0.14)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(.97)" }, to: { opacity: "1", transform: "none" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(100%)" }, to: { opacity: "1", transform: "none" } },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(.9)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fade-in .4s ease both",
        "scale-in": "scale-in .22s cubic-bezier(.16,1,.3,1) both",
        "slide-up": "slide-up .32s cubic-bezier(.16,1,.3,1) both",
        "pop-in": "pop-in .34s cubic-bezier(.16,1,.3,1) both",
        "pulse-ring": "pulse-ring 2s cubic-bezier(.4,0,.6,1) infinite",
      },
      maxWidth: { content: "1200px", prose: "68ch" },
    },
  },
  plugins: [],
};
export default config;
