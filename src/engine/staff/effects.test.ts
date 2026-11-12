import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../match';
import { createRng } from '../rng';
import { createWorld } from '../season';
import { validStarters } from '../squad';
import type { StaffAttr } from '../types';
import { runVeto } from '../veto';
import { pressureFactor, prepBonus, staffAttrsOf, tacticBonus, vetoNoise, type StaffAttrs } from './effects';

const all = (v: number): StaffAttrs => ({ TAT: v, VET: v, GES: v, LEI: v, PRE: v, PRS: v, MOT: v });
const w = createWorld('furia');
const t = w.teams.furia;
const roster = validStarters(t, w.players).map((id) => w.players[id]);
const clone = { ...t, id: 'clone', shortName: 'CLN' };

function winRate(a: StaffAttrs, b: StaffAttrs, n = 400): number {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateMatch({ teamA: t, teamB: clone, playersA: roster, playersB: roster, format: 'MD1', stage: 'grupos', seed: i + 1, staffA: a, staffB: b });
    if (r.winnerTeamId === t.id) wins++;
  }
  return wins / n;
}

describe('Comissão técnica na partida', () => {
  it('fórmulas do spec', () => {
    expect(tacticBonus(95)).toBeCloseTo(1.5);
    expect(vetoNoise(95)).toBeCloseTo(1);
    expect(vetoNoise(40)).toBeCloseTo(8);
    expect(prepBonus(95)).toBeCloseTo(2);
    expect(pressureFactor(95)).toBeCloseTo(0.5);
    expect(pressureFactor(40)).toBeCloseTo(1);
  });

  it('cargo vago conta como 50', () => {
    const vago = { ...w, teams: { ...w.teams, furia: { ...t, staff: { tecnico: null, analista: null, psicologo: null } } } };
    expect(staffAttrsOf(vago, 'furia')).toEqual(all(50));
    expect(staffAttrsOf(w, 'furia').TAT).toBe(w.staff[t.staff.tecnico!].attrs.TAT);
  });

  it('staff forte vence mais que staff fraco (mesmo elenco)', () => {
    expect(winRate(all(95), all(40)) - winRate(all(40), all(95))).toBeGreaterThanOrEqual(0.1);
  });

  it('sem staff informado, a partida é a mesma de antes (mesma semente)', () => {
    const base = { teamA: t, teamB: clone, playersA: roster, playersB: roster, format: 'MD3' as const, stage: 'playoffs' as const, seed: 7 };
    const r1 = simulateMatch(base);
    const r2 = simulateMatch(base);
    expect(r1).toEqual(r2);
    expect(simulateMatch({ ...base, staffA: all(50), staffB: all(50) }).maps.length).toBeGreaterThan(0);
  });

  it('veto: técnico de Veto 95 erra menos que de Veto 40', () => {
    const best = (veto: ReturnType<typeof runVeto>) => veto.find((s) => s.action === 'pick' && s.teamId === t.id)!.map;
    const rival = w.teams.vitality;
    const ideal = [...(Object.keys(t.mapStrength) as Array<keyof typeof t.mapStrength>)]
      .sort((a, b) => t.mapStrength[b] - rival.mapStrength[b] - (t.mapStrength[a] - rival.mapStrength[a]));
    let good = 0;
    let bad = 0;
    for (let i = 0; i < 300; i++) {
      const hi = runVeto([t, rival], 'MD3', createRng(i), [all(95), all(50)]);
      const lo = runVeto([t, rival], 'MD3', createRng(i), [{ ...all(40), VET: 40, LEI: 40 } as Record<StaffAttr, number>, all(50)]);
      if (ideal.slice(0, 3).includes(best(hi))) good++;
      if (ideal.slice(0, 3).includes(best(lo))) bad++;
    }
    expect(good).toBeGreaterThan(bad);
  });
});
