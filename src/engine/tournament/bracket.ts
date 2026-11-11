// Mata-mata (eliminação simples), com disputa de 3º lugar opcional.
import type { BracketSlot, BracketStage, Series, SlotSource } from './types';

export function createBracket(name: string, slots: BracketSlot[]): BracketStage {
  return { kind: 'bracket', name, slots };
}

function resolve(b: BracketStage, src: SlotSource): string | null {
  if ('team' in src) return src.team;
  const s = b.slots.find((x) => x.id === ('winnerOf' in src ? src.winnerOf : src.loserOf))?.series;
  if (!s?.winnerId) return null;
  return 'winnerOf' in src ? s.winnerId : s.loserId!;
}

export function nextBracketMatches(b: BracketStage, makeId: (slotId: string) => string): Series[] {
  const created: Series[] = [];
  for (const slot of b.slots) {
    if (slot.series) continue;
    const a = resolve(b, slot.a);
    const c = resolve(b, slot.b);
    if (!a || !c) continue;
    slot.series = { id: makeId(slot.id), teamAId: a, teamBId: c, format: slot.format, stage: slot.stage, label: `${b.name} · ${slot.label}` };
    created.push(slot.series);
  }
  return created;
}

export const bracketDone = (b: BracketStage) => b.slots.every((s) => s.series?.winnerId);

/** Vencedor da grande final (sempre o último slot). */
export const bracketChampion = (b: BracketStage) => b.slots[b.slots.length - 1].series?.winnerId ?? null;

const ROUND_LABEL: Record<number, string> = { 8: 'Oitavas de final', 4: 'Quartas de final', 2: 'Semifinal', 1: 'Grande final' };

export function slot(
  id: string,
  label: string,
  a: SlotSource,
  b: SlotSource,
  loserPlace: string,
  final = false,
  winnerPlace?: string,
): BracketSlot {
  return { id, label, a, b, loserPlace, winnerPlace, format: final ? 'MD5' : 'MD3', stage: final ? 'final' : 'playoffs' };
}

/**
 * Mata-mata a partir da primeira rodada (2, 4, 8 ou 16 jogos): partidas vizinhas se encontram na rodada seguinte.
 * Quem cai numa rodada de k jogos fica em (k+1)º–(2k)º; com disputa de 3º, os perdedores das semis jogam por 3º e 4º.
 */
export function singleElim(name: string, firstRound: Array<[SlotSource, SlotSource]>, thirdPlace = false): BracketStage {
  const slots: BracketSlot[] = [];
  let round: string[] = [];
  let k = firstRound.length;
  let r = 1;
  firstRound.forEach(([a, b], i) => {
    const id = `R${r}M${i + 1}`;
    slots.push(slot(id, ROUND_LABEL[k], a, b, k === 1 ? 'Vice' : k === 2 && thirdPlace ? '' : `${k + 1}º–${2 * k}º`, k === 1));
    round.push(id);
  });
  while (k > 1) {
    k /= 2;
    r++;
    const next: string[] = [];
    for (let i = 0; i < k; i++) {
      const id = k === 1 ? 'F' : `R${r}M${i + 1}`;
      const loserPlace = k === 1 ? 'Vice' : k === 2 && thirdPlace ? '' : `${k + 1}º–${2 * k}º`;
      if (k === 1 && thirdPlace) {
        const [s1, s2] = round;
        slots.push(slot('TP', 'Disputa de 3º lugar', { loserOf: s1 }, { loserOf: s2 }, '4º', false, '3º'));
      }
      slots.push(slot(id, ROUND_LABEL[k], { winnerOf: round[2 * i] }, { winnerOf: round[2 * i + 1] }, loserPlace, k === 1));
      next.push(id);
    }
    round = next;
  }
  return createBracket(name, slots);
}

/** Primeira rodada padrão para seeds em ordem (1×8, 4×5, 2×7, 3×6 para 8 times). */
export function seededPairs(seeds: string[]): Array<[SlotSource, SlotSource]> {
  const order = (n: number): number[] => {
    if (n === 1) return [0];
    const prev = order(n / 2);
    return prev.flatMap((i) => [i, n - 1 - i]);
  };
  const o = order(seeds.length);
  const pairs: Array<[SlotSource, SlotSource]> = [];
  for (let i = 0; i < o.length; i += 2) pairs.push([{ team: seeds[o[i]] }, { team: seeds[o[i + 1]] }]);
  return pairs;
}
