import { describe, expect, it } from 'vitest';
import { playoffPreview } from './formats';

describe('Prévia dos playoffs (chave com TBD antes de os playoffs começarem)', () => {
  it('IEM/BLAST (grupos de 16 e Rivals): 6 times, os 1º esperam na semi', () => {
    const b = playoffPreview('groups16', true)!;
    const qf = b.slots.filter((s) => s.label === 'Quartas de final');
    const sf = b.slots.filter((s) => s.label === 'Semifinal');
    expect(qf).toHaveLength(2);
    expect(sf).toHaveLength(2);
    // Cada semi recebe um vencedor de quartas diferente.
    expect(sf.map((s) => ('winnerOf' in s.b ? s.b.winnerOf : '')).sort()).toEqual(['QF1', 'QF2']);
    expect(b.slots.some((s) => s.label === 'Disputa de 3º lugar')).toBe(true);
    expect(playoffPreview('rivals8', false)!.slots.filter((s) => s.label === 'Quartas de final')).toHaveLength(2);
  });

  it('Major, PGL, EPL e BLAST Bounty: chave de 8; EWC: chave de 16', () => {
    for (const f of ['major32', 'swiss16', 'epl24', 'bracket8'] as const)
      expect(playoffPreview(f, false)!.slots.filter((s) => s.label === 'Quartas de final'), f).toHaveLength(4);
    expect(playoffPreview('ewc32', false)!.slots.filter((s) => s.label === 'Oitavas de final')).toHaveLength(8);
  });
});
