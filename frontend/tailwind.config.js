/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        'clay-card': '8px 8px 16px rgba(165, 180, 200, 0.4), inset -6px -6px 12px rgba(180, 195, 215, 0.35), inset 6px 6px 12px rgba(255, 255, 255, 0.9)',
        'clay-hover': '12px 12px 24px rgba(165, 180, 200, 0.5), inset -6px -6px 12px rgba(180, 195, 215, 0.35), inset 6px 6px 12px rgba(255, 255, 255, 0.95)',
        'clay-pressed': 'inset 4px 4px 8px rgba(160, 175, 195, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.8)',
        'clay-pill': '4px 4px 8px rgba(165, 180, 200, 0.3), inset -3px -3px 6px rgba(180, 195, 215, 0.3), inset 3px 3px 6px rgba(255, 255, 255, 0.85)',
      },
    },
  },
  plugins: [],
};