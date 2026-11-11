// Grupo de 8 em dupla eliminação (formato dos grupos do IEM), tudo em MD3.
// Upper: quartas (1×8, 4×5, 2×7, 3×6), semis e final. Vencedor da final = 1º; perdedor = 2º.
// Lower: perdedores das quartas se enfrentam; os vencedores pegam os perdedores das semis (cruzado);
// os dois que sobram jogam o desempate de 3º lugar.
import type { DESlot, DoubleElimGroup, Series } from './types';

type Src = { slot: DESlot; take: 'winner' | 'loser' } | { seed: number };

const PLAN: Record<DESlot, { label: string; a: Src; b: Src }> = {
  UQF1: { label: 'Upper · Quartas', a: { seed: 0 }, b: { seed: 7 } },
  UQF2: { label: 'Upper · Quartas', a: { seed: 3 }, b: { seed: 4 } },
  UQF3: { label: 'Upper · Quartas', a: { seed: 1 }, b: { seed: 6 } },
  UQF4: { label: 'Upper · Quartas', a: { seed: 2 }, b: { seed: 5 } },
  USF1: { label: 'Upper · Semifinal', a: { slot: 'UQF1', take: 'winner' }, b: { slot: 'UQF2', take: 'winner' } },
  USF2: { label: 'Upper · Semifinal', a: { slot: 'UQF3', take: 'winner' }, b: { slot: 'UQF4', take: 'winner' } },
  UF: { label: 'Upper · Final (vaga na semi)', a: { slot: 'USF1', take: 'winner' }, b: { slot: 'USF2', take: 'winner' } },
  LR1A: { label: 'Lower · Rodada 1', a: { slot: 'UQF1', take: 'loser' }, b: { slot: 'UQF2', take: 'loser' } },
  LR1B: { label: 'Lower · Rodada 1', a: { slot: 'UQF3', take: 'loser' }, b: { slot: 'UQF4', take: 'loser' } },
  LR2A: { label: 'Lower · Rodada 2', a: { slot: 'USF2', take: 'loser' }, b: { slot: 'LR1A', take: 'winner' } },
  LR2B: { label: 'Lower · Rodada 2', a: { slot: 'USF1', take: 'loser' }, b: { slot: 'LR1B', take: 'winner' } },
  DEC: { label: 'Decisão do 3º lugar', a: { slot: 'LR2A', take: 'winner' }, b: { slot: 'LR2B', take: 'winner' } },
};

export const DE_SLOTS = Object.keys(PLAN) as DESlot[];

export function createGroup(name: string, seeds: string[]): DoubleElimGroup {
  return { name, seeds, matches: {} };
}

function resolve(g: DoubleElimGroup, src: Src): string | null {
  if ('seed' in src) return g.seeds[src.seed];
  const m = g.matches[src.slot];
  if (!m?.winnerId) return null;
  return src.take === 'winner' ? m.winnerId : m.loserId!;
}

/** Cria as séries cujos dois lados já estão definidos. */
export function nextGroupMatches(g: DoubleElimGroup, makeId: (slot: DESlot) => string): Series[] {
  const created: Series[] = [];
  for (const slot of DE_SLOTS) {
    if (g.matches[slot]) continue;
    const plan = PLAN[slot];
    const x = resolve(g, plan.a);
    const y = resolve(g, plan.b);
    if (!x || !y) continue;
    const seedIdx = (id: string) => g.seeds.indexOf(id);
    const [a, b] = seedIdx(x) <= seedIdx(y) ? [x, y] : [y, x];
    const s: Series = { id: makeId(slot), teamAId: a, teamBId: b, format: 'MD3', stage: 'grupos', label: `${g.name} · ${plan.label}` };
    g.matches[slot] = s;
    created.push(s);
  }
  return created;
}

export const groupDone = (g: DoubleElimGroup) => !!g.matches.UF?.winnerId && !!g.matches.DEC?.winnerId;

/** 1º, 2º e 3º colocados (classificados). */
export function groupQualified(g: DoubleElimGroup): [string, string, string] | null {
  if (!groupDone(g)) return null;
  return [g.matches.UF!.winnerId!, g.matches.UF!.loserId!, g.matches.DEC!.winnerId!];
}

/** Colocação de quem caiu no grupo, pela partida em que perdeu. */
export function groupEliminationPlace(slot: DESlot): string | null {
  if (slot === 'DEC') return '7º–8º';
  if (slot === 'LR2A' || slot === 'LR2B') return '9º–12º';
  if (slot === 'LR1A' || slot === 'LR1B') return '13º–16º';
  return null;
}
