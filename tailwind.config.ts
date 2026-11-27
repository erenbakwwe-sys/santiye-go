import type { Config } from "tailwindcss";

/**
 * ŞantiyeGO tasarım sistemi
 *
 * - navy   : logodaki lacivert (#0F2846) skalası
 * - orange : logodaki turuncu (#EE7513), vurgu ve birincil eylemler için
 * - slate  : nötr gri skala
 * - Köşeler küçük, gölgeler hafif, yazı ağırlıkları ölçülü tutulur.
 */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          600: "#2E4F7A",
          700: "#203E66",
          800: "#163257",
          900: "#0F2846",
          950: "#0A1D35",
        },
        orange: {
          50: "#FFF5EC",
          100: "#FEE7D3",
          200: "#FCCBA2",
          300: "#F8A96A",
          400: "#F38D3B",
          500: "#EE7513",
          600: "#D2620B",
          700: "#AD4F0B",
          800: "#8A3F0E",
          900: "#6E340F",
        },
        yellow: {
          400: "#F2C230",
          500: "#E0AC12",
          600: "#B88A0A",
        },
        slate: {
          50: "#F6F7F9",
          100: "#EEF0F3",
          200: "#E1E4E9",
          300: "#CBD0D8",
          400: "#868D99",
          500: "#596170",
          600: "#454C58",
          700: "#3A404B",
          800: "#272C35",
          900: "#1A1E25",
        },
        surface: {
          50: "#F6F7F9",
          100: "#EEF0F3",
          200: "#E1E4E9",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Okunaklılık: geniş yaş aralığı için varsayılandan bir kademe büyük ölçek.
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],   // 13px
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],    // 15px
        base: ["1.0625rem", { lineHeight: "1.65rem" }], // 17px
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],   // 19px
        xl: ["1.375rem", { lineHeight: "1.9rem" }],     // 22px
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }],  // 26px
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.85rem" }],
      },
      fontWeight: {
        // Aşırı kalın (900) başlıklar yerine ölçülü ağırlıklar
        extrabold: "600",
        black: "700",
      },
      borderRadius: {
        md: "4px",
        lg: "5px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "10px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(23, 25, 28, 0.05)",
        DEFAULT: "0 1px 3px rgba(23, 25, 28, 0.08)",
        md: "0 2px 6px rgba(23, 25, 28, 0.08)",
        lg: "0 4px 14px rgba(23, 25, 28, 0.10)",
        xl: "0 8px 24px rgba(23, 25, 28, 0.12)",
        "2xl": "0 12px 32px rgba(23, 25, 28, 0.16)",
      },
      letterSpacing: {
        tight: "-0.015em",
        tighter: "-0.025em",
      },
    },
  },
  plugins: [],
} satisfies Config;
