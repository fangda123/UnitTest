/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Binance Color Scheme
        binance: {
          bg: '#0B0E11',
          card: '#1E2329',
          border: '#2B3139',
          text: '#EAECEF',
          textSecondary: '#848E9C',
          green: '#0ECB81',
          red: '#F6465D',
          yellow: '#F0B90B',
          blue: '#3861FB',
        },
      },
      fontFamily: {
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

