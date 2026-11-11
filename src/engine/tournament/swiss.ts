// Fase suíça no estilo do Major: 16 times, 3 vitórias classificam, 3 derrotas eliminam (até 5 rodadas).
// Rodada 1: seed 1×9, 2×10, ..., 8×16. Depois, times com a mesma campanha se enfrentam,
// ordenados por Buchholz (soma do saldo dos adversários) e seed: o melhor pega o pior, sem revanche.
import type { Series, SwissStage } from './types';

export const SWISS_WINS = 3;
export const SWISS_LOSSES = 3;

export function createSwiss(name: string, seeds: string[], allBo3: boolean, eliminatedBasePlace: number): SwissStage {
  const records: SwissStage['records'] = {};
  for (const id of seeds) records[id] = { w: 0, l: 0, opponents: [] };
  return { kind: 'swiss', name, seeds, allBo3, eliminatedBasePlace, records, rounds: [] };
}

export const isActive = (s: SwissStage, id: string) => s.records[id].w < SWISS_WINS && s.records[id].l < SWISS_LOSSES;

export function buchholz(s: SwissStage, id: string): number {
  return s.records[id].opponents.reduce((sum, o) => sum + s.records[o].w - s.records[o].l, 0);
}

export function swissDone(s: SwissStage): boolean {
  return s.seeds.every((id) => !isActive(s, id)) && s.rounds.every((r) => r.every((m) => m.winnerId));
}

/** Classificação: campanha, Buchholz e seed. */
export function swissStandings(s: SwissStage): string[] {
  const seedIdx = (id: string) => s.seeds.indexOf(id);
  return [...s.seeds].sort((a, b) => {
    const ra = s.records[a];
    const rb = s.records[b];
    return rb.w - ra.w || ra.l - rb.l || buchholz(s, b) - buchholz(s, a) || seedIdx(a) - seedIdx(b);
  });
}

export const swissAdvanced = (s: SwissStage) => swissStandings(s).filter((id) => s.records[id].w >= SWISS_WINS);
export const swissEliminated = (s: SwissStage) => swissStandings(s).filter((id) => s.records[id].l >= SWISS_LOSSES);

/** Emparelha uma lista ordenada: o primeiro com o último possível, evitando revanches (backtracking). */
function pairPool(s: SwissStage, pool: string[]): Array<[string, string]> | null {
  if (pool.length === 0) return [];
  const [first, ...rest] = pool;
  for (let i = rest.length - 1; i >= 0; i--) {
    const opp = rest[i];
    if (s.records[first].opponents.includes(opp)) continue;
    const others = rest.filter((_, j) => j !== i);
    const tail = pairPool(s, others);
    if (tail) return [[first, opp], ...tail];
  }
  return null;
}

/** Gera a próxima rodada (não joga). Retorna as séries criadas. */
export function nextSwissRound(s: SwissStage, makeId: (n: number) => string): Series[] {
  const roundNo = s.rounds.length + 1;
  const seedIdx = (id: string) => s.seeds.indexOf(id);
  let pairs: Array<[string, string]> = [];

  if (roundNo === 1) {
    const half = s.seeds.length / 2;
    for (let i = 0; i < half; i++) pairs.push([s.seeds[i], s.seeds[i + half]]);
  } else {
    const active = s.seeds.filter((id) => isActive(s, id));
    const keys = [...new Set(active.map((id) => `${s.records[id].w}-${s.records[id].l}`))].sort((a, b) => {
      const [wa, la] = a.split('-').map(Number);
      const [wb, lb] = b.split('-').map(Number);
      return wb - wa || la - lb;
    });
    let carry: string[] = [];
    for (const key of keys) {
      const pool = [
        ...carry,
        ...active
          .filter((id) => `${s.records[id].w}-${s.records[id].l}` === key)
          .sort((a, b) => buchholz(s, b) - buchholz(s, a) || seedIdx(a) - seedIdx(b)),
      ];
      carry = pool.length % 2 ? [pool.pop()!] : [];
      // Se não houver emparelhamento sem revanche, aceita revanche (caso raríssimo).
      const paired = pairPool(s, pool) ?? pool.reduce<Array<[string, string]>>((acc, id, i) => (i % 2 ? acc : [...acc, [id, pool[i + 1]]]), []);
      pairs = pairs.concat(paired);
    }
  }

  const series: Series[] = pairs.map(([x, y], i) => {
    const [a, b] = seedIdx(x) <= seedIdx(y) ? [x, y] : [y, x];
    const { w, l } = s.records[a];
    const decisive = [s.records[a], s.records[b]].some((r) => r.w === SWISS_WINS - 1 || r.l === SWISS_LOSSES - 1);
    return {
      id: makeId(i),
      teamAId: a,
      teamBId: b,
      format: s.allBo3 || decisive ? 'MD3' : 'MD1',
      stage: 'grupos',
      label: `${s.name} · Rodada ${roundNo} · ${w}-${l}`,
    };
  });
  s.rounds.push(series);
  return series;
}

/** Aplica o resultado de uma série nas campanhas. */
export function applySwissResult(s: SwissStage, m: Series) {
  const a = s.records[m.teamAId];
  const b = s.records[m.teamBId];
  a.opponents.push(m.teamBId);
  b.opponents.push(m.teamAId);
  if (m.winnerId === m.teamAId) {
    a.w++;
    b.l++;
  } else {
    b.w++;
    a.l++;
  }
}

/** Colocações dos eliminados: quem caiu com mais vitórias fica à frente; empatados dividem a faixa. */
export function swissEliminationPlaces(s: SwissStage): Record<string, string> {
  const out: Record<string, string> = {};
  const elim = swissEliminated(s);
  let place = s.eliminatedBasePlace;
  for (let w = SWISS_WINS - 1; w >= 0; w--) {
    const group = elim.filter((id) => s.records[id].w === w);
    if (!group.length) continue;
    const label = group.length === 1 ? `${place}º` : `${place}º–${place + group.length - 1}º`;
    for (const id of group) out[id] = label;
    place += group.length;
  }
  return out;
}
