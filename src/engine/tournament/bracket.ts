// Mata-mata em eliminação simples.
import type { BracketSlot, BracketStage, Series } from './types';

export function createBracket(name: string, slots: BracketSlot[]): BracketStage {
  return { kind: 'bracket', name, slots };
}

function resolve(b: BracketStage, src: BracketSlot['a']): string | null {
  if ('team' in src) return src.team;
  return b.slots.find((s) => s.id === src.winnerOf)?.series?.winnerId ?? null;
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

/** Vencedor da última partida da chave. */
export const bracketChampion = (b: BracketStage) => b.slots[b.slots.length - 1].series?.winnerId ?? null;
