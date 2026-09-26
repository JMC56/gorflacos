/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif']
      },
      colors: {
        ink: '#213242',
        cream: '#fffaf5',
        candy: '#ff7eb6',
        bubblegum: '#ffb7d5',
        aqua: '#68d8d6',
        lemon: '#ffe07a',
        grape: '#9b8cff',
        mint: '#b9f2d0',
        tomato: '#f76c8f',
        citrus: '#ffc857',
        leaf: '#2d9c91'
      },
      boxShadow: {
        soft: '0 24px 70px rgba(33, 50, 66, 0.12)'
      }
    }
  },
  plugins: []
};