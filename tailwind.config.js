/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ECEFE4',
        card: '#FCFBF5',
        ink: { DEFAULT: '#222C24', soft: '#5A6659' },
        brand: { DEFAULT: '#26503F', deep: '#19382B', soft: '#E4EBDD' },
        hl: '#F4C95D',
        clay: '#C2563A',
        line: '#D3DAC6',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(34,44,36,.05), 0 4px 14px rgba(34,44,36,.06)',
      },
    },
  },
  plugins: [],
}
