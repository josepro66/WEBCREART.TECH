/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'inter': ['Inter', 'sans-serif'],
        'chakra': ['Chakra Petch', 'sans-serif'],
        'grotesk': ['Space Grotesk', 'sans-serif'],
        'plexmono': ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        neon: {
          lime: '#D0FF00',
          magenta: '#FF47E2',
          cyan: '#00E5FF',
          purple: '#8B5CF6',
        },
        dark: {
          900: '#0B0F14',
          800: '#05060A',
          700: '#1A1A1A',
          600: '#2A2A2A',
        }
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'marquee-slow': 'marquee 50s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #D0FF00, 0 0 10px #D0FF00, 0 0 15px #D0FF00' },
          '100%': { boxShadow: '0 0 10px #D0FF00, 0 0 20px #D0FF00, 0 0 30px #D0FF00' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      }
    },
  },
  plugins: [],
}

