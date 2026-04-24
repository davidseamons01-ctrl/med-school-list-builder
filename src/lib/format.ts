export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not loaded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not loaded";
  return `${Math.round(value * 100)}%`;
}

export function titleizeKey(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

