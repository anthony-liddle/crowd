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
        // paper-tint sits subtly darker than paper. Used as the background
        // of "owned by you" crowd cards — distinct enough for the eye to
        // pick up, quiet enough not to read as a separate category.
        'paper-tint': '#F0E9D9',
        ink: '#1A1814',
        'ink-2': '#3A3631',
        dust: '#6B6862',
        'dust-2': '#A09B91',
        rule: '#E0DAC9',
        ember: '#B85A2C',
        'on-ember': '#FFF7EE',
        // ember-warn fires for "less than 30 minutes left" — a stronger
        // red-tinted ember, distinct from `warn` which is reserved for
        // destructive actions like "Leave".
        'ember-warn': '#C73E1D',
        warn: '#B23A48',

        // Dark mode palette — used with dark: prefix
        'paper-d': '#14130F',
        'paper-2-d': '#1B1A15',
        'paper-tint-d': '#221E18',
        'ink-d': '#EDE7D9',
        'ink-2-d': '#C9C2B2',
        'dust-d': '#8A8579',
        'dust-2-d': '#5A554B',
        'rule-d': '#2A2724',
        'ember-d': '#D08454',
        'on-ember-d': '#1A1814',
        'ember-warn-d': '#E45F45',
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
