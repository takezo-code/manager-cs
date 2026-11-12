import { describe, expect, it } from 'vitest';
import { monthlySatisfaction } from '../morale/satisfaction';
import { playerOvr } from '../player';
import { createWorld } from '../season';
import type { MatchResult } from '../types';
import type { World } from '../world';
import { changeMood, crowdBonus, fanMood, fansDay, fanSponsorFactor, moodLabel } from './fans';

const series = (winner: string, loser: string, stage: MatchResult['stage'] = 'grupos'): MatchResult =>
  ({ teamAId: winner, teamBId: loser, winnerTeamId: winner, stage, format: 'MD3', seed: 1, veto: [], maps: [], mapScore: {}, ratings: {} }) as MatchResult;
const withMood = (w: World, teamId: string, v: number): World => ({ ...w, fans: { ...w.fans, [teamId]: v } });

describe('Humor da torcida', () => {
  const w0 = createWorld('furia');

  it('começa em 55 e fica entre 0 e 100', () => {
    expect(fanMood(w0, 'furia')).toBe(55);
    expect(fanMood(changeMood(w0, 'furia', 80), 'furia')).toBe(100);
    expect(fanMood(changeMood(w0, 'mouz', -80), 'mouz')).toBe(0);
  });

  it('série: ±1,5, em dobro nos playoffs e na final', () => {
    let out = fansDay(w0, w0, { a: series('furia', 'mouz') });
    expect(fanMood(out, 'furia')).toBeCloseTo(56.5);
    expect(fanMood(out, 'mouz')).toBeCloseTo(53.5);
    out = fansDay(w0, w0, { a: series('furia', 'mouz', 'final') });
    expect(fanMood(out, 'furia')).toBeCloseTo(58);
  });

  it('título +8; subir no ranking +1 por posição; salário atrasado −5', () => {
    const ev = { ...w0.calendar[0], status: 'encerrado' as const, tournament: { ...(w0.calendar[0].tournament ?? ({} as never)), championId: 'furia' } };
    const prev = { ...w0, calendar: [{ ...w0.calendar[0], status: 'em_andamento' as const }] };
    expect(fanMood(fansDay(prev, { ...w0, calendar: [ev] }, {}), 'furia')).toBeCloseTo(63);
    const next = { ...w0, teams: { ...w0.teams, furia: { ...w0.teams.furia, hltvRank: w0.teams.furia.hltvRank - 2, lateMonths: 1 } } };
    expect(fanMood(fansDay(w0, next, {}), 'furia')).toBeCloseTo(55 + 2 - 5);
  });

  it('contratação de OVR ≥ 85 +4; venda do ídolo −8', () => {
    const star = Object.values(w0.players).find((p) => p.teamId && p.teamId !== 'furia' && playerOvr(p) >= 85)!;
    const buy = { ...w0, transferLog: [{ date: w0.date, kind: 'transferencia' as const, playerId: star.id, fromTeamId: star.teamId, toTeamId: 'furia', fee: 1 }] };
    expect(fanMood(fansDay(w0, buy, {}), 'furia')).toBeCloseTo(59);
    const idol = [...w0.teams.furia.starters].sort((a, b) => playerOvr(w0.players[b]) - playerOvr(w0.players[a]))[0];
    const sell = { ...w0, transferLog: [{ date: w0.date, kind: 'transferencia' as const, playerId: idol, fromTeamId: 'furia', toTeamId: 'g2', fee: 1 }] };
    expect(fanMood(fansDay(w0, sell, {}), 'furia')).toBeCloseTo(47);
  });

  it('Comunicação 100 reduz as perdas em 30% (só no seu time)', () => {
    const w = { ...w0, manager: { ...w0.manager, attrs: { ...w0.manager.attrs, COM: 100 } } };
    expect(fanMood(changeMood(w, 'furia', -10), 'furia')).toBeCloseTo(48);
    expect(fanMood(changeMood(w, 'mouz', -10), 'mouz')).toBeCloseTo(45);
  });

  it('humor < 30: patrocínio −15% e −1 de satisfação mensal sem Sangue Frio; > 70: +10% e bônus em playoffs', () => {
    expect(fanSponsorFactor(withMood(w0, 'furia', 20))).toBeCloseTo(0.85);
    expect(fanSponsorFactor(withMood(w0, 'furia', 80))).toBeCloseTo(1.1);
    expect(fanSponsorFactor(w0)).toBe(1);
    expect(crowdBonus(withMood(w0, 'furia', 100), 'furia', 'final')).toBeCloseTo(1.5);
    expect(crowdBonus(withMood(w0, 'furia', 100), 'furia', 'grupos')).toBe(0);
    expect(crowdBonus(withMood(w0, 'furia', 60), 'furia', 'playoffs')).toBe(0);
    const id = w0.teams.furia.starters[0];
    const base = { ...w0, players: { ...w0.players, [id]: { ...w0.players[id], satisfaction: 70, skillId: null } } };
    const a = monthlySatisfaction(base).players[id].satisfaction;
    const b = monthlySatisfaction(withMood(base, 'furia', 10)).players[id].satisfaction;
    expect(b).toBeLessThan(a);
  });

  it('frase do humor', () => {
    expect(moodLabel(10)).toBe('Torcida revoltada');
    expect(moodLabel(55)).toBe('Torcida tranquila');
    expect(moodLabel(90)).toBe('Torcida empolgada');
  });
});
