import { describe, expect, it } from 'vitest';
import { playerStance } from '../market/negotiation';
import { createWorld } from '../season';
import type { World } from '../world';
import { monthlyManagerGrowth } from './effects';
import { titleReputation } from './reputation';

const withRep = (w: World, reputation: number): World => ({ ...w, manager: { ...w.manager, reputation } });

describe('Reputação do manager', () => {
  it('título: Major/EWC +12, evento de 16+ times +6, menor +3; só conta o do seu time', () => {
    const w = createWorld('furia');
    expect(titleReputation(w, 'furia', 'major32', 32, 'Major').manager.reputation).toBe(22);
    expect(titleReputation(w, 'furia', 'ewc32', 32, 'EWC').manager.reputation).toBe(22);
    expect(titleReputation(w, 'furia', 'groups16', 16, 'IEM').manager.reputation).toBe(16);
    expect(titleReputation(w, 'furia', 'rivals8', 8, 'Rivals').manager.reputation).toBe(13);
    expect(titleReputation(w, 'mouz', 'major32', 32, 'Major').manager.reputation).toBe(10);
    expect(titleReputation(w, 'furia', 'major32', 32, 'Major').manager.titles).toEqual([{ event: 'Major', date: w.date, teamId: 'furia' }]);
  });

  it('mês com caixa saudável: +0,2', () => {
    expect(monthlyManagerGrowth(createWorld('furia')).manager.reputation).toBeCloseTo(10.2);
  });

  it('Lenda: jogador pede 10% menos para vir; estrela aceita time até 20 posições abaixo', () => {
    const w = { ...createWorld('big'), date: '2027-01-05' };
    const star = Object.values(w.players).find((p) => p.teamId === 'vitality' && w.teams.vitality.starters.includes(p.id) && p.age < 30)!;
    const s0 = playerStance(w, star.id, 'big', 'transfer');
    const s1 = playerStance(withRep(w, 100), star.id, 'big', 'transfer');
    expect(s1.desired.salary / s0.desired.salary).toBeCloseTo(0.9, 1);
    // BIG é o #32: estrela de time top recusa com reputação baixa; com Lenda, o limite é 20 posições.
    const top = Object.values(w.players).find((p) => p.teamId === 'g2' && p.contract && w.teams.g2.starters.includes(p.id))!;
    expect(w.teams.big.hltvRank - w.teams.g2.hltvRank).toBeGreaterThan(12);
    expect(w.teams.big.hltvRank - w.teams.g2.hltvRank).toBeLessThanOrEqual(20);
    const ovrStar = { ...w, players: { ...w.players, [top.id]: { ...top, baseAttributes: Object.fromEntries(Object.keys(top.baseAttributes).map((k) => [k, 90])) as typeof top.baseAttributes } } };
    expect(playerStance(ovrStar, top.id, 'big', 'transfer').refuses).toBeTruthy();
    expect(playerStance(withRep(ovrStar, 100), top.id, 'big', 'transfer').refuses).toBeNull();
  });
});
