export function cleanDocument(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCNPJ(value: string): string {
  return cleanDocument(value).slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCNPJorCPF(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 ? formatCPF(value) : formatCNPJ(value);
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0%";
  return `${value.toFixed(1)}%`;
}

export const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  in_committee: "Em Comitê",
  approved: "Aprovado",
  approved_restricted: "Aprovado c/ Restrição",
  rejected: "Reprovado",
};

export const statusColors: Record<string, string> = {
  draft: "bg-status-draft/15 text-status-draft",
  in_committee: "bg-status-committee/15 text-status-committee",
  approved: "bg-status-approved/15 text-status-approved",
  approved_restricted: "bg-status-restricted/15 text-status-restricted",
  rejected: "bg-status-rejected/15 text-status-rejected",
};

export const voteLabels: Record<string, string> = {
  approve: "Aprovar",
  restrict: "Aprovar c/ Restrição",
  reject: "Reprovar",
};

export const recommendationLabels: Record<string, string> = {
  approve: "Aprovar",
  restrict: "Aprovar c/ Restrição",
  reject: "Reprovar",
};

export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
