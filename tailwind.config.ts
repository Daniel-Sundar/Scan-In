import type { Config } from 'tailwindcss';

// Glass design system: obsidian surfaces / cobalt structure / acid-lime accents.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#070A12',
        midnight: '#070A12',
        ink: '#0F172A',
        cobalt: { DEFAULT: '#2563EB', deep: '#1D4ED8', light: '#60A5FA' },
        lime: { DEFAULT: '#CCFF00', soft: '#A3E635' },
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        link: 'rgb(var(--link) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(37,99,235,0.4)',
        'glow-lime': '0 0 25px rgba(204,255,0,0.3)',
      },
      keyframes: {
        scan: { '0%,100%': { transform: 'translateY(-60%)' }, '50%': { transform: 'translateY(60%)' } },
        'bounce-soft': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: { scan: 'scan 1.6s ease-in-out infinite', 'bounce-soft': 'bounce-soft 1s ease-in-out infinite' },
    },
  },
  plugins: [],
};
export default config;
