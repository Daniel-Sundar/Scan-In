import type { Config } from 'tailwindcss';

// 60-30-10: midnight surfaces (60) / cobalt structure (30) / acid-lime accents (10)
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0B0F19',
        ink: '#111827',
        cobalt: { DEFAULT: '#2563EB', deep: '#1D4ED8', light: '#60A5FA' },
        lime: { DEFAULT: '#CCFF00', soft: '#A3E635' },
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        link: 'rgb(var(--link) / <alpha-value>)',
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      keyframes: {
        scan: { '0%,100%': { transform: 'translateY(-60%)' }, '50%': { transform: 'translateY(60%)' } },
      },
      animation: { scan: 'scan 1.6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
export default config;
