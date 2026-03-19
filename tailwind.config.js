/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#F5F0FF',
          100: '#D6C4FF',
          200: '#B596FF',
          300: '#9366FF',
          400: '#7C3AED',
          500: '#6D28D9',
          600: '#5B21B6',
          700: '#4C1D95',
          800: '#2E1065',
          900: '#1E0A45',
        },
        ghost: {
          900: '#FFFFFF', // Pure White Base
          800: '#FDFBFF', // Ghost White (Subtle Purple Tint)
          700: '#F5F0FF', // Lighter Purple
          600: '#E9E0FF', // Light Purple
          500: '#D6C4FF', // Soft Purple
          400: '#B596FF', // Medium Purple
          300: '#9366FF', // Vibrant Purple
          200: '#7C3AED', // Core Ghost Purple (Primary)
          100: '#1E0A45', // Deep Midnight Purple (T1 Text)
          50:  '#0F0421', // Absolute Dark (T0 Text)
          accent: '#7C3AED',
          'accent-light': '#A855F7',
          'accent-glow': 'rgba(124, 58, 237, 0.15)',
          gold: '#F59E0B',
          success: '#10B981',
          danger: '#EF4444',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ghost-gradient': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px #7c3aed55' },
          '50%': { boxShadow: '0 0 24px #7c3aed99' },
        },
      },
    },
  },
  plugins: [],
};
