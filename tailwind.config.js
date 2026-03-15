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
        soft: '0 6px 20px rgba(15, 23, 42, 0.08)',
        'soft-lg': '0 10px 30px rgba(15, 23, 42, 0.12)',
        'dark-soft': '0 8px 24px rgba(2, 6, 23, 0.4)'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        shimmer: 'shimmer 1.5s infinite'
      }
    }
  },
  plugins: []
};
