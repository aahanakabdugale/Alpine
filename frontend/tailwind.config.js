/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: {
          canvas: {
            light: '#F0FFF4',
            dark: '#0E2A26',
          },
          surface: {
            light: '#E6FFED',
            dark: '#123B35',
          },
          primary: {
            light: '#14BBA6',
            dark: '#2DD4BF',
          },
          accent: '#5EEAD4',
          text: {
            light: '#1F2937',
            dark: '#E6FFED',
          },
        },
      },
      boxShadow: {
        // Physical matte light claymorphic shadows
        'clay-card': '8px 8px 16px rgba(18, 59, 53, 0.08), -8px -8px 16px rgba(255, 255, 255, 0.9), inset 2px 2px 4px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(20, 187, 166, 0.04)',
        'clay-hover': '12px 12px 24px rgba(18, 59, 53, 0.12), -10px -10px 20px rgba(255, 255, 255, 1), inset 2px 2px 4px rgba(255, 255, 255, 0.9)',
        'clay-pill': '4px 4px 10px rgba(18, 59, 53, 0.07), -4px -4px 10px rgba(255, 255, 255, 0.8)',
        'clay-pressed': 'inset 3px 3px 6px rgba(18, 59, 53, 0.12), inset -3px -3px 6px rgba(255, 255, 255, 0.6)',

        // Matte nocturnal dark claymorphic shadows with organic deep teal bevels
        'clay-dark-card': '10px 10px 20px rgba(4, 12, 10, 0.7), -6px -6px 14px rgba(25, 75, 68, 0.15), inset 1px 1px 2px rgba(94, 234, 212, 0.12), inset -2px -2px 4px rgba(0, 0, 0, 0.5)',
        'clay-dark-hover': '14px 14px 26px rgba(4, 12, 10, 0.85), -8px -8px 18px rgba(25, 75, 68, 0.22), inset 1px 1px 2px rgba(94, 234, 212, 0.16)',
        'clay-dark-pill': '4px 4px 8px rgba(4, 12, 10, 0.6), -3px -3px 6px rgba(25, 75, 68, 0.15)',
        'clay-dark-pressed': 'inset 4px 4px 8px rgba(0, 0, 0, 0.6), inset -2px -2px 4px rgba(45, 212, 191, 0.1)',
      },
    },
  },
  plugins: [],
};