/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette EXIA Academy — dérivée du logo officiel (petrol #315864 /
        // teal-accent #44A997). Les anciens noms de tokens (paper, ink,
        // verdigris...) sont conservés pour ne pas casser les pages pas
        // encore migrées visuellement, mais pointent désormais vers la
        // vraie identité EXIA plutôt que l'ancienne palette provisoire.
        paper: "#F7FAF9",
        ink: "#17262A",
        surface: "#FFFFFF",
        verdigris: {
          DEFAULT: "#315864",
          dark: "#1F3E47",
          light: "#E7F0EF",
        },
        brass: {
          DEFAULT: "#44A997",
          light: "#EAF6F2",
        },
        rust: {
          DEFAULT: "#B3432B",
          light: "#F6E4DE",
        },
        line: "#DCE6E5",
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
