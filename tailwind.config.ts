import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - Deep navy with gold accents
        verse: {
          bg: '#0a0e14',
          surface: '#111820',
          elevated: '#1a2332',
          border: '#243044',
          muted: '#3d4f65',
          text: '#e8eef5',
          subtle: '#8899ad',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4a853',
          600: '#b8923f',
          700: '#9a7b32',
          800: '#7c6328',
          900: '#5f4b1f',
        },
        // Status colors
        confidence: {
          high: '#22c55e',
          medium: '#eab308',
          low: '#6b7280',
        },
        status: {
          listening: '#ef4444',
          ready: '#22c55e',
          paused: '#f59e0b',
        }
      },
      fontFamily: {
        // Display font for headings and scripture references
        display: ['Playfair Display', 'Georgia', 'serif'],
        // Body font for UI elements
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        // Scripture text
        scripture: ['Cormorant Garamond', 'Georgia', 'serif'],
        // Monospace for technical elements
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-md': ['2rem', { lineHeight: '1.3' }],
        'scripture': ['2.5rem', { lineHeight: '1.6' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 168, 83, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 168, 83, 0.5)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url('/noise.svg')",
      },
    },
  },
  plugins: [],
}

export default config
