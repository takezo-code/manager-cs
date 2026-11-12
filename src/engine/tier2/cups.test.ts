import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { cupDay, cupPoints, startCup, tier2Ranking } from './cups';
import { academyTeamId } from './model';

const at = (date: string): World => ({ ...createWorld('furia'), date, calendar: [] });

describe('Tier 2 Cup', () => {
  it('começa no dia 5 (fev–nov) com 16 times; a academy do manager entra sempre', () => {
    const w = startCup(at('2027-03-05'), createRng(1));
    expect(w.tier2.cup?.participants).toHaveLength(16);
    expect(w.tier2.cup?.participants).toContain(academyTeamId('furia'));
    expect(startCup(at('2027-12-05'), createRng(1)).tier2.cup).toBeNull();
    expect(startCup(at('2027-03-06'), createRng(1)).tier2.cup).toBeNull();
  });

  it('entram os de mais pontos', () => {
    let w = at('2027-04-05');
    const top = Object.keys(w.tier2.teams).slice(0, 15);
    w = { ...w, tier2: { ...w.tier2, points: Object.fromEntries(top.map((id, i) => [id, 500 - i])) } };
    const p = startCup(w, createRng(2)).tier2.cup!.participants;
    for (const id of top) expect(p).toContain(id);
  });

  it('pontos por colocação: 100/70/50/30/15/5', () => {
    expect(['Campeão', 'Vice', '3º–4º', '5º–8º', '9º–11º', '12º–14º'].map(cupPoints)).toEqual([100, 70, 50, 30, 15, 5]);
  });

  it('a copa termina com campeão, distribui pontos e os jovens crescem por mapa', () => {
    let w = startCup(at('2027-03-05'), createRng(3));
    const youth = w.teams.furia.academyIds[0];
    const g0 = JSON.stringify(w.players[youth].growth);
    for (let i = 0; i < 20 && w.tier2.cup; i++) w = cupDay(w);
    expect(w.tier2.cup).toBeNull();
    const ranking = tier2Ranking(w);
    expect(ranking[0].points).toBe(100);
    expect(ranking.filter((r) => r.points > 0)).toHaveLength(16);
    expect(JSON.stringify(w.players[youth].growth)).not.toBe(g0);
  });

  it('um ano de dailyTick: 10 copas e o ranking zera em 1º de janeiro', () => {
    let w: World = { ...createWorld('furia'), date: '2027-01-01' };
    let cups = 0;
    for (let i = 0; i < 364; i++) {
      const had = !!w.tier2.cup;
      w = dailyTick(w).world;
      if (had && !w.tier2.cup) cups++;
    }
    expect(cups).toBe(10);
    expect(Object.keys(w.tier2.points).length).toBeGreaterThan(0);
    w = dailyTick({ ...w, date: '2027-12-31' }).world;
    expect(w.tier2.points).toEqual({});
    expect(w.tier2.season).toBe(2028);
  }, 60_000);
});
