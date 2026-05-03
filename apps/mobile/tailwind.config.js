/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode palette
        paper: '#F5F0E4',
        'paper-2': '#EFE9DA',
        ink: '#1A1814',
        'ink-2': '#3A3631',
        dust: '#6B6862',
        'dust-2': '#A09B91',
        rule: '#E0DAC9',
        ember: '#B85A2C',
        'on-ember': '#FFF7EE',
        warn: '#B23A48',

        // Dark mode palette — used with dark: prefix
        'paper-d': '#14130F',
        'paper-2-d': '#1B1A15',
        'ink-d': '#EDE7D9',
        'ink-2-d': '#C9C2B2',
        'dust-d': '#8A8579',
        'dust-2-d': '#5A554B',
        'rule-d': '#2A2724',
        'ember-d': '#D08454',
        'on-ember-d': '#1A1814',
        'warn-d': '#D87078',
      },
      fontFamily: {
        serif: ['LibreBaskerville_400Regular'],
        'serif-italic': ['LibreBaskerville_400Regular_Italic'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
      fontSize: {
        meta: ['11px', { lineHeight: '14px' }],
        caption: ['12px', { lineHeight: '16px' }],
        body: ['13px', { lineHeight: '20px' }],
        post: ['16px', { lineHeight: '23px' }],
        compose: ['17px', { lineHeight: '25px' }],
        title: ['24px', { lineHeight: '26px' }],
        mark: ['42px', { lineHeight: '46px' }],
      },
      spacing: {
        'screen-x': '22px',
        'post-y': '16px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
