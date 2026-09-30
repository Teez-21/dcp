import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-soft": "var(--panel-soft)",
        "panel-2": "var(--panel-2)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        accent2: "var(--accent2)",
        "on-accent": "var(--on-accent)",
        c1: "var(--c1)", c2: "var(--c2)", c3: "var(--c3)",
        c4: "var(--c4)", c5: "var(--c5)", c6: "var(--c6)", c7: "var(--c7)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        sheen: { to: { transform: "rotate(360deg)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        sheen: "sheen 7s linear infinite",
        "fade-up": "fade-up .4s ease both",
        "accordion-down": "accordion-down .2s ease",
        "accordion-up": "accordion-up .18s ease",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
