/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./apps/web/**/*.{html,js,css}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}