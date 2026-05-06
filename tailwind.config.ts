import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // shadcn tokens — mantidos para compatibilidade com componentes ui/
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Trilho Design System — tokens diretos
        marinho: {
          DEFAULT: "#0A1538",
          deep: "#070F2B",
        },
        esmeralda: {
          DEFAULT: "#00D49A",
          dark: "#009E73",
          soft: "#D6F5E8",
        },
        off: "#F7F7F2",
        paper: "#FBFBF7",
        cinza: "#E8E9E2",
        "cinza-soft": "#F0F1EB",
        "row-alt": "#F4F5F1",

        // Texto
        ink: "#0A1538",

        // Status / Tier
        tier: {
          aaa: "#D6F5E8",
          aa:  "#D6F5E8",
          a:   "#E2F2EC",
          bbb: "#FFF6DC",
          bb:  "#FFE9B8",
          b:   "#FCE3CE",
          c:   "#FCE3CE",
          d:   "#F5D6DA",
        },

        // Status operacionais
        status: {
          aprovado:  "#D6F5E8",
          analise:   "#FFF6DC",
          comite:    "#FFE9B8",
          restrito:  "#FCE3CE",
          rejeitado: "#F5D6DA",
          rascunho:  "#E8E9E2",
          avencer:   "#E8E9E2",
          atrasado:  "#FCE3CE",
          vencido:   "#F5D6DA",
        },

        // Status de análise de crédito (text-status-* / bg-status-* / border-status-*)
        "status-approved":   "#009E73",
        "status-committee":  "#7A5B00",
        "status-restricted": "#8A3B00",
        "status-rejected":   "#7A0E1E",
        "status-draft":      "#5A647A",
        "status-warning":    "#8A6B00",

        // Semânticos
        warn:   "#D9A300",
        danger: "#B0182A",
        "warn-soft":   "#FFF6DC",
        "danger-soft": "#F5D6DA",
        "orange-soft": "#FCE3CE",
      },

      fontFamily: {
        sans: ["Geist", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },

      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs:   ["11px", { lineHeight: "1.4" }],
        sm:   ["12px", { lineHeight: "1.5" }],
        base: ["13px", { lineHeight: "1.5" }],
        md:   ["14px", { lineHeight: "1.5" }],
        lg:   ["18px", { lineHeight: "1.4" }],
        xl:   ["22px", { lineHeight: "1.3" }],
        "2xl": ["28px", { lineHeight: "1.2" }],
        "3xl": ["32px", { lineHeight: "1.1" }],
        display: ["56px", { lineHeight: "1" }],
      },

      letterSpacing: {
        tight:  "-0.03em",
        snug:   "-0.025em",
        normal: "0",
        wide:   "0.08em",
        wider:  "0.12em",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Trilho border-radius
        "t-sm":   "8px",
        "t-md":   "12px",
        "t-lg":   "16px",
        "t-xl":   "20px",
        "t-pill": "999px",
      },

      boxShadow: {
        "t-sm": "0 1px 2px rgba(10,21,56,0.04)",
        "t-md": "0 4px 12px rgba(10,21,56,0.06)",
        "t-lg": "0 8px 24px rgba(10,21,56,0.08)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
