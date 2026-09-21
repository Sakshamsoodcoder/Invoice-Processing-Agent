/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rivlo: {
          bg: '#0c0e12',
          surface: '#12151b',
          card: '#181b21',
          'card-hover': '#1e222b',
          border: '#252932',
          'border-subtle': '#1c2027',
          mint: '#8ff59c',
          'mint-hover': '#7de48b',
          'mint-dark': '#0d1710',
          'mint-card': '#9bf4ab',
          lavender: '#8b8cf8',
          'lavender-light': '#a5a6f6',
          'lavender-dark': '#1e1e38',
          muted: '#7e8695',
          'muted-light': '#a0a8b7',
        },
        brand: {
          50: '#eefcf1',
          100: '#d7f7de',
          200: '#b2f0bf',
          300: '#8ff59c',
          400: '#5de070',
          500: '#35c64c',
          600: '#25a439',
          700: '#1f8230',
          800: '#1e662b',
          900: '#1a5426',
          950: '#092e12',
        },
        navy: {
          800: '#0F172A',
          900: '#0B1120',
          950: '#060913',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
