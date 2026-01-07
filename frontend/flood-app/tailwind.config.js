/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#05080fff",     // charcoal midnight
        bg1: "#0a101bff",     // deeper panels
        panel: "#0f1728ff",   // surface cards
        teal: "#22d3ee",      // cyan accent
        teal2: "#67e8f9",     // bright cyan
        ok: "#22c55e",        // green
        adv: "#fb923c",       // amber
        warn: "#fcd34d",      // yellow
        text0: "#e2e8f0",     // near-white
        text1: "#94a3b8",     // slate gray
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(103,232,249,0.25), 0 0 24px rgba(103,232,249,0.15)",
      },
      backgroundImage: {
        grid: `
          linear-gradient(rgba(103,232,249,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(103,232,249,0.08) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        grid: "48px 48px",
      },
    },
  },
  plugins: [],
};
