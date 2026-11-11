// Formatação e arredondamento compartilhados pelo motor e pela interface.

/** Arredonda para o múltiplo mais próximo de `step` (ex.: 500, 10_000). */
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** "US$ 1,25 mi" ou "US$ 850 mil". */
export const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `US$ ${(v / 1_000_000).toFixed(2).replace('.', ',')} mi` : `US$ ${Math.round(v / 1000)} mil`;
