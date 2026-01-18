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
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
            from: { opacity: "0" },
            to: { opacity: "1" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "in": "fade-in 0.2s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out", 
      },
    },
  },
  plugins: [
      // If you haven't installed tailwindcss-animate, these custom keyframes in theme.extend 
      // will ensure the basic animations still work without the plugin.
  ],
}