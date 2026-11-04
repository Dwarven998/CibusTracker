/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cibus: {
          navy: '#0B2545',
          secondaryNavy: '#153E70',
          blue: '#268DE0',
          lightBlue: '#EAF4FF',
          bg: '#F4F7FB',
          card: '#FFFFFF',
          text: '#102542',
          muted: '#64748B',
          success: '#159B62',
          warning: '#F59E0B',
          danger: '#E5484D',
          border: '#E2E8F0',
        },
      },
      boxShadow: {
        card: '0 2px 12px -2px rgba(16, 37, 66, 0.06), 0 1px 4px -1px rgba(16, 37, 66, 0.04)',
        elevated: '0 10px 25px -5px rgba(11, 37, 69, 0.10), 0 4px 10px -2px rgba(11, 37, 69, 0.05)',
      },
    },
  },
  plugins: [],
};
