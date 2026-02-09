/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        gold: {
          500: '#d4af37',
          600: '#b4941f',
        }
      },
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
        serif: ['David Libre', 'Georgia', 'serif'],
      },
      keyframes: {
        "fade-in": {
            from: { opacity: "0" },
            to: { opacity: "1" },
        },
        "zoom-in": {
            from: { transform: "scale(0.95)", opacity: "0" },
            to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-bottom": {
            from: { transform: "translateY(20px)", opacity: "0" },
            to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-top": {
            from: { transform: "translateY(-20px)", opacity: "0" },
            to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
            from: { transform: "translateX(100%)" },
            to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
            from: { transform: "translateX(-100%)" },
            to: { transform: "translateX(0)" },
        }
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
        "zoom-in": "zoom-in 0.2s ease-out forwards",
        "slide-in-bottom": "slide-in-bottom 0.5s ease-out forwards",
        "slide-in-top": "slide-in-top 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "slide-in-left": "slide-in-left 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
}