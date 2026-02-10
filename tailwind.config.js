/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tabhub-bg': '#F4F7F9',
        'tabhub-sidebar': '#121727',
        'tabhub-card': '#FFFFFF',
        'tabhub-text': '#202736'
      },
      boxShadow: {
        soft: '0 6px 20px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
