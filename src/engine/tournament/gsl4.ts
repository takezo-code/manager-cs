// Grupo GSL de 4 (BLAST Rivals), tudo MD3: abertura 1×4 e 2×3; os vencedores se enfrentam
// (quem ganha é o 1º), os perdedores se enfrentam (quem perde cai) e a decisão define 2º e 3º.
import type { Gsl4Group, Gsl4Slot, Series } from './types';

type Src = { slot: Gsl4Slot; take: 'winner' | 'loser' } | { seed: number };

const PLAN: Record<Gsl4Slot, { label: string; a: Src; b: Src }> = {
  O1: { label: 'Abertura', a: { seed: 0 }, b: { seed: 3 } },
  O2: { label: 'Abertura', a: { seed: 1 }, b: { seed: 2 } },
  W: { label: 'Partida dos vencedores', a: { slot: 'O1', take: 'winner' }, b: { slot: 'O2', take: 'winner' } },
  L: { label: 'Partida dos perdedores', a: { slot: 'O1', take: 'loser' }, b: { slot: 'O2', take: 'loser' } },
  D: { label: 'Decisão', a: { slot: 'W', take: 'loser' }, b: { slot: 'L', take: 'winner' } },
};

export const GSL4_SLOTS = Object.keys(PLAN) as Gsl4Slot[];

export function createGsl4(name: string, seeds: string[], eliminatedPlace: string): Gsl4Group {
  return { kind: 'gsl4', name, seeds, eliminatedPlace, matches: {} };
}

function resolve(g: Gsl4Group, src: Src): string | null {
  if ('seed' in src) return g.seeds[src.seed];
  const m = g.matches[src.slot];
  if (!m?.winnerId) return null;
  return src.take === 'winner' ? m.winnerId : m.loserId!;
}

export function nextGsl4Matches(g: Gsl4Group, makeId: (slot: Gsl4Slot) => string): Series[] {
  const created: Series[] = [];
  for (const slot of GSL4_SLOTS) {
    if (g.matches[slot]) continue;
    const x = resolve(g, PLAN[slot].a);
    const y = resolve(g, PLAN[slot].b);
    if (!x || !y) continue;
    const [a, b] = g.seeds.indexOf(x) <= g.seeds.indexOf(y) ? [x, y] : [y, x];
    const s: Series = { id: makeId(slot), teamAId: a, teamBId: b, format: 'MD3', stage: 'grupos', label: `${g.name} · ${PLAN[slot].label}` };
    g.matches[slot] = s;
    created.push(s);
  }
  return created;
}

export const gsl4Done = (g: Gsl4Group) => GSL4_SLOTS.every((s) => !!g.matches[s]?.winnerId);

/** 1º, 2º e 3º (null enquanto o grupo não acabou). */
export function gsl4Qualified(g: Gsl4Group): string[] | null {
  if (!gsl4Done(g)) return null;
  return [g.matches.W!.winnerId!, g.matches.D!.winnerId!, g.matches.D!.loserId!];
}

export const gsl4Series = (g: Gsl4Group): Series[] => GSL4_SLOTS.map((k) => g.matches[k]).filter((m): m is Series => !!m);
