/** Paleta canônica de design — use sempre que precisar de inline styles com cores do sistema */
export const T = {
  marinho:     "#0A1538",
  esmeralda:   "#00D49A",
  amber:       "#D9A300",
  danger:      "#B0182A",
  text:        "#0A1538",
  textMute:    "rgba(10,21,56,0.62)",
  textFaint:   "rgba(10,21,56,0.42)",
  border:      "rgba(10,21,56,0.07)",
  borderMed:   "rgba(10,21,56,0.10)",
  borderStrong:"rgba(10,21,56,0.16)",
  cinza:       "#E8E9E2",
  off:         "#F7F7F2",
  paper:       "#FBFBF7",
  white:       "#FFFFFF",
} as const;

export type TokenKey = keyof typeof T;
