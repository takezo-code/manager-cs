// Relação entre times: -100 a +100 por par, guardada com a chave "a|b" em ordem alfabética.

export type Relations = Record<string, number>;

export const relationKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const getRelation = (rel: Relations, a: string, b: string) => rel[relationKey(a, b)] ?? 0;

export function changeRelation(rel: Relations, a: string, b: string, delta: number): Relations {
  const k = relationKey(a, b);
  return { ...rel, [k]: Math.max(-100, Math.min(100, (rel[k] ?? 0) + delta)) };
}

export function relationsFromList(list: Array<{ a: string; b: string; value: number }>): Relations {
  const out: Relations = {};
  for (const r of list) out[relationKey(r.a, r.b)] = r.value;
  return out;
}

export function relationLabel(v: number): string {
  if (v >= 50) return 'Excelente';
  if (v >= 20) return 'Boa';
  if (v > -20) return 'Neutra';
  if (v > -60) return 'Ruim';
  return 'Péssima';
}
