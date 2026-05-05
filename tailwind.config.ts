import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn tokens — mapeados para variáveis CSS (mantidos intactos)
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        navbar: {
          DEFAULT: "hsl(var(--navbar))",
          foreground: "hsl(var(--navbar-foreground))",
        },
        status: {
          draft: "hsl(var(--status-draft))",
          committee: "hsl(var(--status-committee))",
          approved: "hsl(var(--status-approved))",
          restricted: "hsl(var(--status-restricted))",
          rejected: "hsl(var(--status-rejected))",
        },

        // SINK Design System — tokens diretos (use: text-sink-mint, bg-sink-deep, etc.)
        sink: {
          // Escala deep (teal escuro)
          deep:    "#07232A",
          "deep-2": "#0B2A2E",
          "deep-3": "#103239",
          "deep-4": "#18404A",
          // Escala mint (verde menta)
          mint:        "#2BD49C",
          "mint-2":    "#5FE3B5",
          "mint-3":    "#17A679",
          "mint-soft": "#D4F5E8",
          // Neutros quentes
          cream:    "#F3EFE6",
          "cream-2": "#EAE4D5",
          paper:    "#FBF9F3",
          // Texto
          ink:      "#0A1F24",
          fog:      "#D9E3DF",
          // Semânticos
          warn:   "#F3B84A",
          danger: "#E26B5A",
        },
      },
      fontFamily: {
        // SINK typografia
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // SINK border-radius extras
        "sink-sm":   "6px",
        "sink-md":   "10px",
        "sink-lg":   "16px",
        "sink-xl":   "24px",
        "sink-pill": "999px",
      },
      boxShadow: {
        // SINK sombras
        "sink-sm":   "0 1px 2px rgba(7,35,42,0.06), 0 1px 3px rgba(7,35,42,0.04)",
        "sink-md":   "0 4px 12px rgba(7,35,42,0.08), 0 2px 4px rgba(7,35,42,0.04)",
        "sink-lg":   "0 12px 32px rgba(7,35,42,0.12), 0 4px 12px rgba(7,35,42,0.06)",
        "sink-glow": "0 0 0 6px rgba(43,212,156,0.18)",
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
