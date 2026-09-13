import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  // Project toggles dark mode via `data-theme` on <html> (see src/hooks/useTheme.js),
  // not via a `.dark` class, so shadcn's dark variants must key off that attribute.
  darkMode: ['class', ':root[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tabhub-bg': '#F4F7F9',
        'tabhub-sidebar': '#121727',
        'tabhub-card': '#FFFFFF',
        'tabhub-text': '#202736',
        // shadcn/ui tokens. Namespaced as --ui-* so they never collide with the
        // project's own --accent / --muted (which mean different things).
        background: 'hsl(var(--ui-background))',
        foreground: 'hsl(var(--ui-foreground))',
        card: {
          DEFAULT: 'hsl(var(--ui-card))',
          foreground: 'hsl(var(--ui-card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--ui-popover))',
          foreground: 'hsl(var(--ui-popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--ui-primary))',
          foreground: 'hsl(var(--ui-primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--ui-secondary))',
          foreground: 'hsl(var(--ui-secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--ui-muted))',
          foreground: 'hsl(var(--ui-muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--ui-accent))',
          foreground: 'hsl(var(--ui-accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--ui-destructive))',
          foreground: 'hsl(var(--ui-destructive-foreground))'
        },
        sidebar: 'hsl(var(--ui-sidebar))',
        scrim: 'hsl(var(--ui-scrim))',
        // Third text level from the design (counts, URLs, section labels).
        faint: 'hsl(var(--ui-faint))',
        warning: {
          DEFAULT: 'hsl(var(--ui-warning))',
          foreground: 'hsl(var(--ui-warning-foreground))'
        },
        border: 'hsl(var(--ui-border))',
        input: 'hsl(var(--ui-input))',
        ring: 'hsl(var(--ui-ring))'
      },
      borderRadius: {
        // Anchored on the design's own values rather than on a base radius, so
        // every shadcn primitive lands where the design puts it with no
        // per-call-site override: Card is rounded-xl (9px), Dialog rounded-lg,
        // Button/Input rounded-md (8px), menu and select items rounded-sm (6px).
        sm: '6px',
        md: '8px',
        lg: '9px',
        xl: '9px'
      },
      boxShadow: {
        // The project's elevation shadow, so panels can say `shadow-panel`
        // instead of an inline style={{ boxShadow: 'var(--shadow)' }}.
        panel: 'var(--shadow)',
        soft: '0 6px 20px rgba(15, 23, 42, 0.08)',
        'soft-lg': '0 10px 30px rgba(15, 23, 42, 0.12)',
        'dark-soft': '0 8px 24px rgba(2, 6, 23, 0.4)'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Noto Sans SC"', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
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
  plugins: [tailwindcssAnimate]
};
