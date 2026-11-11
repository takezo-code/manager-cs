// Grupo de 8 em dupla eliminação, tudo em MD3 (a abertura pode ser MD1).
// Upper: quartas (1×8, 4×5, 2×7, 3×6), semis e final. Lower: perdedores das quartas se enfrentam; os
// vencedores pegam os perdedores das semis (cruzado); os dois que sobram fazem a final do lower.
// Com 3 classificados: vencedor e perdedor da final do upper + vencedor da final do lower.
// Com 4 (EWC): vencedores das semis do upper + vencedores da 2ª rodada do lower.
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
  DEC: { label: 'Lower · Final', a: { slot: 'LR2A', take: 'winner' }, b: { slot: 'LR2B', take: 'winner' } },
};

export const DE_SLOTS = Object.keys(PLAN) as DESlot[];

/** Partidas que existem no grupo (com 4 classificados não há final do upper nem do lower). */
const slotsFor = (g: DoubleElimGroup) => (g.advance === 4 ? DE_SLOTS.filter((s) => s !== 'UF' && s !== 'DEC') : DE_SLOTS);

export function createGroup(
  name: string,
  seeds: string[],
  opts: { advance?: 3 | 4; openingBo1?: boolean; placeLabels?: Partial<Record<DESlot, string>> } = {},
): DoubleElimGroup {
  const advance = opts.advance ?? 3;
  const placeLabels =
    opts.placeLabels ??
    (advance === 3 ? { LR1A: '13º–16º', LR1B: '13º–16º', LR2A: '9º–12º', LR2B: '9º–12º', DEC: '7º–8º' } : {});
  return { kind: 'de8', name, seeds, advance, openingBo1: !!opts.openingBo1, placeLabels, matches: {} };
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
  for (const slot of slotsFor(g)) {
    if (g.matches[slot]) continue;
    const plan = PLAN[slot];
    const x = resolve(g, plan.a);
    const y = resolve(g, plan.b);
    if (!x || !y) continue;
    const seedIdx = (id: string) => g.seeds.indexOf(id);
    const [a, b] = seedIdx(x) <= seedIdx(y) ? [x, y] : [y, x];
    const format = g.openingBo1 && slot.startsWith('UQF') ? 'MD1' : 'MD3';
    const s: Series = { id: makeId(slot), teamAId: a, teamBId: b, format, stage: 'grupos', label: `${g.name} · ${plan.label}` };
    g.matches[slot] = s;
    created.push(s);
  }
  return created;
}

export const groupDone = (g: DoubleElimGroup) => slotsFor(g).every((s) => !!g.matches[s]?.winnerId);

/** Classificados em ordem de seed para os playoffs (null enquanto o grupo não acabou). */
export function groupQualified(g: DoubleElimGroup): string[] | null {
  if (!groupDone(g)) return null;
  const w = (s: DESlot) => g.matches[s]!.winnerId!;
  if (g.advance === 4) return [w('USF1'), w('USF2'), w('LR2A'), w('LR2B')];
  return [w('UF'), g.matches.UF!.loserId!, w('DEC')];
}

/** Séries do grupo na ordem do plano. */
export const groupSeries = (g: DoubleElimGroup): Series[] => DE_SLOTS.map((k) => g.matches[k]).filter((m): m is Series => !!m);
