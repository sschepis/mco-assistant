import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Crucial for our ThemeContext
  theme: {
    extend: {
      colors: {
        // These allow using classes like bg-background, text-foreground
        background: 'var(--color-bg)', // Renamed from --background for clarity
        foreground: 'var(--color-text-base)', // Renamed from --foreground

        // You can still define specific shades if needed,
        // but primary theming comes from CSS variables in globals.css
        primary: {
          DEFAULT: 'var(--color-link)', // Example: map primary to link color
          '50': '#eff6ff',  // Keeping these as examples if needed directly
          '100': '#dbeafe',
          '200': '#bfdbfe',
          '300': '#93c5fd', // Used for html.dark --color-link-hover
          '400': '#60a5fa', // Used for html.dark --color-link
          '500': '#3b82f6', // Used for :root --color-button-bg
          '600': '#2563eb', // Used for :root --color-link
          '700': '#1d4ed8', // Used for :root --color-link-hover
          '800': '#1e40af',
          '900': '#1e3a8a',
          '950': '#172554',
        },
        dark: { // These were the original Tailwind dark palette shades
          '50': '#f9fafb',
          '100': '#f3f4f6', // Used for html.dark --color-text-base
          '200': '#e5e7eb',
          '300': '#d1d5db', // Used for html.dark --color-text-muted
          '400': '#9ca3af', // Used for html.dark --color-text-subtle
          '500': '#6b7280',
          '600': '#4b5563', // Used for html.dark --color-button-hover-bg
          '700': '#374151', // Used for html.dark --color-border & --color-button-bg
          '800': '#1f2937', // Used for html.dark --color-input-bg & --color-code-bg
          '900': '#111827', // Used for :root --color-text-base
          '950': '#030712',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
}
export default config