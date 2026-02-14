/** @type {import('tailwindcss').Config} */
export default {
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
      }
    },
  },
  plugins: [],
}
