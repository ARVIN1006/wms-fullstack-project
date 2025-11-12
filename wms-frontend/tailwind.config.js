/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Mengganti palet warna 'blue' dengan warna 'indigo'
      // Ini akan mengubah tampilan navbar, tombol login, dll. secara global
      colors: {
        blue: {
          50: '#eef2ff',   // indigo-50
          100: '#e0e7ff',  // indigo-100
          200: '#c7d2fe',  // indigo-200
          300: '#a5b4fc',  // indigo-300
          400: '#818cf8',  // indigo-400
          500: '#6366f1',  // indigo-500 (Base)
          600: '#4f46e5',  // indigo-600 (Main Button)
          700: '#4338ca',  // indigo-700
          800: '#3730a3',  // indigo-800 (Navbar Background)
          900: '#312e81',  // indigo-900
          950: '#1e1b4b',  // indigo-950
        },
      },
    },
  },
  plugins: [],
}