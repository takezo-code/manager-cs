import { describe, expect, it } from 'vitest';
import { START_DATE, addDays } from './date';
import { applyRanking, computeRanking } from './ranking';
import { createWorld } from './season';
import type { World } from './world';

const byRank = (w: World) => Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);

describe('Ranking HLTV', () => {
  it('no começo, só os pontos de legado: líder com 1000 e a ordem real mantida', () => {
    const w = createWorld('furia');
    const before = byRank(w);
    const after = applyRanking(w);
    expect(byRank(after)).toEqual(before);
    expect(after.teams[before[0]].hltvPoints).toBe(1000);
    expect(after.teams[before[0]].rankHistory.at(-1)).toMatchObject({ date: START_DATE, rank: 1, points: 1000 });
  });

  it('o campeão de um Major sobe no ranking', () => {
    let w = createWorld('furia');
    const team = w.teams.mongolz;
    w = {
      ...w,
      results: [{ eventId: 'major-x', teamId: 'mongolz', date: w.date, placeFactor: 1, weight: 1, roster: [...team.starters] }],
    };
    expect(applyRanking(w).teams.mongolz.hltvRank).toBeLessThan(team.hltvRank);
  });

  it('regra do núcleo: o resultado deixa de contar se o time troca 3 dos 5 titulares', () => {
    let w = createWorld('furia');
    const team = w.teams.mongolz;
    w = { ...w, results: [{ eventId: 'major-x', teamId: 'mongolz', date: w.date, placeFactor: 1, weight: 1, roster: [...team.starters] }] };
    const with5 = computeRanking(w).find((r) => r.teamId === 'mongolz')!.points;
    const newStarters = [...team.starters.slice(0, 2), 'kwezz', 'queenix', 'altekz'];
    const changed = { ...w, teams: { ...w.teams, mongolz: { ...team, starters: newStarters, legacyRoster: newStarters } } };
    const with2 = computeRanking(changed).find((r) => r.teamId === 'mongolz')!.points;
    expect(with2).toBeLessThan(with5);
  });

  it('os pontos de legado chegam a 0 depois de 365 dias sem resultados', () => {
    const w = { ...createWorld('furia'), date: addDays(START_DATE, 365) };
    expect(computeRanking(w).every((r) => r.points === 0)).toBe(true);
  });

  it('forma: vitórias recentes somam pontos', () => {
    let w = createWorld('furia');
    const roster = [...w.teams.big.starters];
    const wins = Array.from({ length: 10 }, (_, i) => ({ date: w.date, winner: 'big', loser: i % 2 ? 'vitality' : 'spirit', winnerRoster: roster }));
    w = { ...w, seriesLog: wins };
    const before = computeRanking(createWorld('furia')).find((r) => r.teamId === 'big')!.points;
    expect(computeRanking(w).find((r) => r.teamId === 'big')!.points).toBeGreaterThan(before);
  });
});
