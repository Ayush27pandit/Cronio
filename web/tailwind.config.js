/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        body: "#4d4d4d",
        mute: "#8f8f8f",
        faint: "#a1a1a1",
        hairline: "#ebebeb",
        'hairline-soft': "#f2f2f2",
        canvas: "#fafafa",
        'canvas-elevated': "#ffffff",
        link: "#0070f3",
        'link-deep': "#0761d1",
        violet: "#7928ca",
        cyan: "#50e3c2",
        pink: "#ff0080",
        magenta: "#eb367f",
      },
      fontFamily: {
        sans: ["Geist", "Arial", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        pill: "100px",
        'pill-category': "64px",
      },
    },
  },
  plugins: [],
}
