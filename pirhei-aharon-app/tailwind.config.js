/** @type {import('tailwindcss').Config} */
export default {
  // הנתיבים שבהם Tailwind יסרוק את ה-classes (כמו 'bg-blue-500')
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}