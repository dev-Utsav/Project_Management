/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'agency-bg': 'rgb(var(--agency-bg) / <alpha-value>)',
        'agency-sidebar': 'rgb(var(--agency-sidebar) / <alpha-value>)',
        'agency-card': 'rgb(var(--agency-card) / <alpha-value>)',
        'agency-border': 'rgb(var(--agency-border) / <alpha-value>)',
        'agency-accent': 'rgb(var(--agency-accent) / <alpha-value>)',
        gray: {
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [],
}
 