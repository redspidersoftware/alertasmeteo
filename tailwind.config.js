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
        // Design tokens — MeteoAlerta
        brand: {
          DEFAULT: '#003f87',
          600: '#004a9c',
          500: '#0056b3',
          400: '#2d7dd2',
          100: '#d7e2ff',
          50: '#eef3ff',
        },
        ink: {
          DEFAULT: '#181c20',
          700: '#424752',
          500: '#727784',
          300: '#c2c6d4',
          100: '#ebeef3',
          50: '#f1f4f9',
          25: '#f7f9ff',
        },
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
