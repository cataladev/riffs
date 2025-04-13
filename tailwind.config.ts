import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class", 
  theme: {
    extend: {
      animation: {
        fadeIn: "fadeIn 2s ease-in-out",
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #9722b6, #fe5b35, #eb3d5f)',
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      
    },
  },
  plugins: [require("tailwindcss-animate"), require("tailwindcss-animated")],
} satisfies Config;
