import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--background)',
        panel: {
          DEFAULT: 'var(--panel)',
          elevated: 'var(--panel-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
          soft: 'var(--accent-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },
      },
      backgroundColor: {
        hover: 'var(--hover)',
        active: 'var(--active)',
        selection: 'var(--selection)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        'focus-ring': 'var(--focus-ring)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
      },
    },
  },
  plugins: [],
} satisfies Config
