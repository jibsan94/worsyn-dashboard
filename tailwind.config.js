/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    'node_modules/flowbite/dist/flowbite.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Instrument Sans', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'DM Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}
