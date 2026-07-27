import type { Config } from "tailwindcss";

/**
 * La rampa de grises no lleva valores fijos: apunta a variables CSS que se
 * invierten en modo oscuro (ver app/globals.css).
 *
 * Es lo que permite que las ~2.800 clases `text-gray-*`, `bg-gray-*` y
 * `border-gray-*` repartidas por 126 ficheros cambien de tema sin tocar ni un
 * componente. Reescribirlas a mano habría dado un diff imposible de revisar y
 * deuda nueva cada vez que se añadiera una pantalla.
 *
 * `<alpha-value>` mantiene funcionando los modificadores tipo `bg-gray-900/50`.
 */
const gris = (nombre: string) => `rgb(var(--c-${nombre}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        karuma: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        gray: {
          50: gris("gray-50"),
          100: gris("gray-100"),
          200: gris("gray-200"),
          300: gris("gray-300"),
          400: gris("gray-400"),
          500: gris("gray-500"),
          600: gris("gray-600"),
          700: gris("gray-700"),
          800: gris("gray-800"),
          900: gris("gray-900"),
          950: gris("gray-950"),
        },
        /**
         * Superficie SIEMPRE oscura, en los dos temas. Para los sitios donde el
         * fondo negro es intencionado y el texto encima es blanco fijo: con
         * `bg-gray-900` se volverían claros al invertir la rampa y el texto
         * blanco desaparecería.
         */
        tinta: {
          DEFAULT: "#111827",
          suave: "#1f2937",
        },
      },
    },
  },
  plugins: [],
};

export default config;
