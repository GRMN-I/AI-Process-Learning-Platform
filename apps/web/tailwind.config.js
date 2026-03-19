/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: "#f2f4fd",
          100: "#e4e9fc",
          200: "#c9d3f7",
          300: "#aab8f2",
          400: "#8b9eed",
          500: "#6b85e8",
          600: "#496BE3",
          700: "#3d5bc7",
          800: "#3249a8",
          900: "#243170",
          950: "#1a2352",
        },
      },
    },
  },
  plugins: [],
};
