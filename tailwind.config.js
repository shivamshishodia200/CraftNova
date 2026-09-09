/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./craftmedia_admin/**/*.{js,ts,jsx,tsx}",
    "./craftmedia-super admin/**/*.{js,ts,jsx,tsx}",
    "./360crm_admin/**/*.{js,ts,jsx,tsx}",
    "./360crm_superadmin/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        craft: {
          amber: '#f59e0b',
          gold: '#fbbf24',
          orange: '#f97316',
          crimson: '#dc2626',
          ruby: '#e11d48',
          dark: '#070b14',
          card: '#0d1527',
          surface: '#111c34',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'craft-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'craft-crimson': '0 0 25px -5px rgba(220, 38, 38, 0.35)',
      }
    },
  },
  plugins: [],
}

