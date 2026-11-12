import { describe, expect, it } from 'vitest';
import { afterSeries, phaseFor } from '../form';
import { proposeCut } from '../morale/conversations';
import { monthlySatisfaction } from '../morale/satisfaction';
import { createRng } from '../rng';
import { createWorld } from '../season';
import type { StaffAttr } from '../types';
import type { World } from '../world';

function withStaff(w: World, values: Partial<Record<StaffAttr, number>>): World {
  const staff = { ...w.staff };
  for (const id of Object.values(w.teams.furia.staff)) {
    const s = staff[id!];
    const attrs = { ...s.attrs };
    for (const k of Object.keys(attrs) as StaffAttr[]) if (values[k] !== undefined) attrs[k] = values[k];
    staff[id!] = { ...s, attrs };
  }
  return { ...w, staff };
}

describe('Comissão técnica fora da partida', () => {
  const base = createWorld('furia');
  const starter = base.teams.furia.starters[0];

  it('Gestão 90 dá +2 de satisfação mensal a quem não tem nada pesando', () => {
    const w0 = { ...base, players: { ...base.players, [starter]: { ...base.players[starter], satisfaction: 70, phase: 'normal' as const } } };
    const at70 = monthlySatisfaction(withStaff(w0, { GES: 70, MOT: 70 })).players[starter].satisfaction;
    const at90 = monthlySatisfaction(withStaff(w0, { GES: 90, MOT: 70 })).players[starter].satisfaction;
    expect(at90 - at70).toBeCloseTo(2);
  });

  it('Motivação 95 reduz pela metade as perdas mensais', () => {
    const p = { ...base.players[starter], satisfaction: 70, phase: 'ma_fase' as const };
    const w0 = { ...base, players: { ...base.players, [starter]: p } };
    const loss40 = 70 - monthlySatisfaction(withStaff(w0, { GES: 70, MOT: 40 })).players[starter].satisfaction;
    const loss95 = 70 - monthlySatisfaction(withStaff(w0, { GES: 70, MOT: 95 })).players[starter].satisfaction;
    expect(loss40).toBeGreaterThan(0);
    // Satisfação é inteira: metade arredondada.
    expect(Math.abs(loss95 - loss40 / 2)).toBeLessThanOrEqual(0.5);
  });

  it('Gestão 90 sobe em 10 p.p. a chance de aceitar redução', () => {
    const ids = base.teams.furia.playerIds;
    const count = (ges: number) => {
      let acc = 0;
      for (let i = 0; i < 400; i++) acc += proposeCut(withStaff(base, { GES: ges }), ids, 10, createRng(i)).accepted.length;
      return acc / (400 * ids.length);
    };
    expect(count(90) - count(70)).toBeGreaterThan(0.06);
  }, 30_000);

  it('Motivação 95 estreita as faixas de abaixo e má fase em 0,025', () => {
    const p = base.players[starter];
    // Rating médio logo abaixo do limite de "abaixo": sem psicólogo cai, com Motivação 95 fica normal.
    let lo = 0.5;
    let hi = 1.5;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const ph = phaseFor({ ...p, recentRatings: [mid, mid, mid, mid] });
      if (ph === 'abaixo' || ph === 'ma_fase') lo = mid;
      else hi = mid;
    }
    const just = hi - 0.01;
    const q = { ...p, recentRatings: [just, just, just, just] };
    expect(phaseFor(q)).not.toBe('normal');
    expect(phaseFor(q, 95)).toBe('normal');
    expect(phaseFor({ ...q, recentRatings: q.recentRatings.map((r) => r - 0.01) }, 95)).toBe('normal');
    expect(phaseFor({ ...q, recentRatings: q.recentRatings.map((r) => r - 0.02) }, 95)).not.toBe('normal');
    expect(afterSeries(p, [1], 95).recentRatings.at(-1)).toBe(1);
  });
});
