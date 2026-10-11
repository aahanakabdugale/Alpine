/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alpine UI Design Tokens mapped to CSS Variables
        canvas: 'var(--canvas)',
        sidebar: 'var(--sidebar)',
        surface: {
          DEFAULT: 'var(--surface)',
          soft: 'var(--surface-soft)',
          hover: 'var(--surface-hover)',
          raised: 'var(--surface-raised)',
          inset: 'var(--surface-inset)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          pressed: 'var(--primary-pressed)',
        },
        accent: 'var(--accent)',
        'soft-mint': 'var(--soft-mint)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'focus-ring': 'var(--focus-ring)',
        status: {
          fresh: 'var(--status-fresh)',
          fading: 'var(--status-fading)',
          danger: 'var(--status-danger)',
          milestone: 'var(--status-milestone)',
        },

        // Legacy / Mint compatibility tokens
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
        // Alpine UI Calibrated Light Claymorphic Shadows
        'clay-card': '6px 8px 18px rgba(18, 59, 53, 0.07), -5px -5px 14px rgba(255, 255, 255, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        'clay-hover': '9px 12px 22px rgba(18, 59, 53, 0.10), -5px -5px 14px rgba(255, 255, 255, 0.95)',
        'clay-pressed': 'inset 2px 3px 6px rgba(18, 59, 53, 0.10), inset 0 1px 2px rgba(255, 255, 255, 0.7)',
        'clay-pill': '4px 4px 10px rgba(18, 59, 53, 0.07), -4px -4px 10px rgba(255, 255, 255, 0.8)',
        'clay-inset': 'inset 2px 2px 5px rgba(18, 59, 53, 0.08), inset -1px -1px 3px rgba(255, 255, 255, 0.6)',
        'clay-popover': '0 14px 34px rgba(18, 59, 53, 0.12), -4px -4px 12px rgba(255, 255, 255, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.95)',

        // Midnight Mint Dark Claymorphic Shadows
        'clay-dark-card': '0 8px 22px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.055)',
        'clay-dark-hover': '0 12px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.09)',
        'clay-dark-pressed': 'inset 0 3px 7px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'clay-dark-pill': '0 4px 12px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.055)',
        'clay-dark-btn': '0 4px 14px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
        'clay-dark-inset': 'inset 0 2px 6px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(0, 0, 0, 0.5)',
        'clay-dark-popover': '0 18px 40px rgba(0, 0, 0, 0.55), 0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',

        // Glassmorphic Elevation Shadows (Dark Deep Mode)
        'glass-card': '0 8px 32px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(45, 212, 191, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-hover': '0 16px 48px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(45, 212, 191, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.09)',
        'glass-pill': '0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(45, 212, 191, 0.1)',
        'glow-btn': '0 0 20px rgba(45, 212, 191, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3)',
        'glow-btn-hover': '0 0 32px rgba(45, 212, 191, 0.55), 0 6px 18px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};