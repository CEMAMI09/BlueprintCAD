/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0f1a',
          900: '#1a1b1e',
          800: '#2c2e33',
          700: '#3d4147',
          600: '#5c5f66',
          500: '#909296',
          400: '#a6a7ab',
          300: '#c1c2c5',
          200: '#e4e5e7',
          100: '#f5f5f5',
        },
      },
    },
  },
  plugins: [],
}