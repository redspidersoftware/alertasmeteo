/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'alert-green': '#22c55e',
        'alert-yellow': '#eab308',
        'alert-orange': '#f97316',
        'alert-red': '#ef4444',
        // ── Design tokens — MeteoAlerta ──
        // Todos responden al modo oscuro vía variables CSS (-rgb) definidas
        // en src/index.css (:root / .dark). Usar estas clases en lugar de
        // colores hex fijos en los componentes.
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          600: 'rgb(var(--brand-strong-rgb) / <alpha-value>)',
          500: 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
          400: '#2d7dd2',
          100: 'rgb(var(--brand-tint-rgb) / <alpha-value>)',
          50: 'rgb(var(--bg-rgb) / <alpha-value>)',
        },
        // Texto/iconos sobre superficies (en oscuro aclara el azul de marca)
        'brand-ink': 'rgb(var(--brand-ink-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--text-rgb) / <alpha-value>)',
          700: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          500: 'rgb(var(--text-faint-rgb) / <alpha-value>)',
          300: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
          100: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
          50: 'rgb(var(--surface-3-rgb) / <alpha-value>)',
          25: 'rgb(var(--bg-rgb) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          2: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--surface-3-rgb) / <alpha-value>)',
        },
        canvas: 'rgb(var(--bg-rgb) / <alpha-value>)',
        line: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        icon: 'rgb(var(--icon-rgb) / <alpha-value>)',
        night: {
          950: '#0b1220',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 16px -8px rgba(15, 23, 42, 0.10)',
      },
      borderRadius: {
        card: '0.75rem',
        panel: '1rem',
      },
    },
  },
  plugins: [],
}
