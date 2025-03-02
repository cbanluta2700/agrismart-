/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './styles/**/*.css',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // AgriSmart specific colors
        "forest-green-dark": "#030A06",
        "forest-green": "#0D3F1F",
        "bright-green": "#38FF7E",
        "light-green": "#E3FFED",
        "muted-green": "#8B949E",
        // HSL color utilities
        "hsl-primary": "hsl(var(--primary))",
        "hsl-primary-dark": "hsl(var(--primary-dark))",
        "hsl-primary-light": "hsl(var(--primary-light))",
        "hsl-accent": "hsl(var(--accent))",
        "hsl-muted": "hsl(var(--muted))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(56, 255, 126, 0)" },
          "50%": { boxShadow: "0 0 10px rgba(56, 255, 126, 0.5)" }
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" }
        },
        "pulse-border": {
          "0%, 100%": { borderColor: "rgba(56, 255, 126, 0.2)" },
          "50%": { borderColor: "rgba(56, 255, 126, 0.6)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-slow": "glow 2s ease-in-out infinite",
        "glow-fast": "glow 1s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-in-out",
        "float": "float 2s ease-in-out infinite",
        "float-slow": "float-slow 3s ease-in-out infinite",
        "pulse-border": "pulse-border 3s ease-in-out infinite",
      },
      boxShadow: {
        'premium-lg': '0 8px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1)',
        'premium-md': '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'premium-sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'premium-inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'card-grain': "url('/assets/patterns/grain.png')",
      },
      backdropBlur: {
        'premium': '10px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-sm': {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
        '.text-shadow-lg': {
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        },
        '.text-glow': {
          textShadow: '0 0 8px rgba(56, 255, 126, 0.6)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}