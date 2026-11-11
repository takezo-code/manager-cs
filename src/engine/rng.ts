// RNG com semente (mulberry32): a mesma semente sempre gera a mesma partida.

export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  chance(p: number): boolean;
  int(min: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Escolha ponderada; pesos <= 0 nunca são escolhidos (salvo se todos forem). */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Normal aproximada (média 0, desvio 1). */
  gaussian(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    chance: (p) => next() < p,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weight) => {
      const ws = items.map((i) => Math.max(0, weight(i)));
      const total = ws.reduce((a, b) => a + b, 0);
      if (total <= 0) return rng.pick(items);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
    gaussian: () => {
      const u = Math.max(next(), 1e-9);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
  return rng;
}

/** Hash de texto para semente (FNV-1a). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
