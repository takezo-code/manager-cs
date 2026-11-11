// Data do jogo (AAAA-MM-DD, sempre em UTC para não depender do fuso).

export const START_DATE = '2026-11-11';

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Último dia do mês, N meses depois da data. */
export function endOfMonthAfter(iso: string, months: number): string {
  const d = toDate(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0)));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** Meses (fracionados) até a data. Negativo se já passou. */
export const monthsUntil = (from: string, to: string) => daysBetween(from, to) / 30.44;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "11 nov 2026". */
export function formatDate(iso: string): string {
  const d = toDate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "jul/2027". */
export function formatMonth(iso: string): string {
  const d = toDate(iso);
  return `${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}
