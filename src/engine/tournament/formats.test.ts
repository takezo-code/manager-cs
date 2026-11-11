import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../../data';
import type { Player, Team } from '../types';
import type { FormatId, FormatOptions } from './formats';
import { allSeries, createTournament, playDay } from './run';
import type { Tournament } from './types';

const teams: Record<string, Team> = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));
const players: Record<string, Player> = Object.fromEntries(INITIAL_PLAYERS.map((p) => [p.id, p]));
const ranked = [...INITIAL_TEAMS].sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);

function run(format: FormatId, n: number, options: FormatOptions = {}, seed = 5): Tournament {
  let t = createTournament({ id: `t-${format}`, name: format, format, options, prizePool: 1_000_000 }, ranked.slice(0, n), seed);
  let ps = players;
  for (let d = 0; d < 80 && !t.championId; d++) {
    const out = playDay(t, teams, ps);
    t = out.tournament;
    ps = out.players;
  }
  return t;
}

const cases: Array<[FormatId, number, FormatOptions?]> = [
  ['major32', 32],
  ['groups16', 16, { thirdPlace: true }],
  ['swiss16', 16],
  ['epl24', 24, { thirdPlace: true }],
  ['ewc32', 32],
  ['rivals8', 8],
  ['bracket8', 8],
];

describe('Formatos de evento', () => {
  for (const [format, n, opts] of cases) {
    it(`${format}: termina com campeão e todos os ${n} colocados`, () => {
      const t = run(format, n, opts);
      expect(t.participants).toHaveLength(n);
      expect(t.championId).toBeTruthy();
      expect(Object.keys(t.placements)).toHaveLength(n);
      expect(Object.values(t.placements).filter((p) => p === 'Campeão')).toHaveLength(1);
      expect(allSeries(t).every((m) => m.winnerId)).toBe(true);
    });
  }

  it('groups16 com disputa de 3º lugar tem um 3º e um 4º', () => {
    const p = Object.values(run('groups16', 16, { thirdPlace: true }).placements);
    expect(p.filter((x) => x === '3º')).toHaveLength(1);
    expect(p.filter((x) => x === '4º')).toHaveLength(1);
  });

  it('ewc32: 4 grupos de 8, playoffs de 16 e final MD5', () => {
    const t = run('ewc32', 32);
    const g = t.stages[0];
    if (g.kind !== 'groups') throw new Error('esperava grupos');
    expect(g.groups.map((x) => x.seeds.length)).toEqual([8, 8, 8, 8]);
    const po = t.stages[1];
    if (po.kind !== 'bracket') throw new Error('esperava mata-mata');
    expect(po.slots.filter((s) => s.label === 'Oitavas de final')).toHaveLength(8);
    expect(po.slots.at(-1)!.format).toBe('MD5');
  });

  it('rivals8: 2 grupos de 4', () => {
    const g = run('rivals8', 8).stages[0];
    if (g.kind !== 'groups') throw new Error('esperava grupos');
    expect(g.groups.map((x) => x.seeds.length)).toEqual([4, 4]);
  });

  it('groups16 com abertura MD1: as quartas do upper são MD1', () => {
    const g = run('groups16', 16, { openingBo1: true }).stages[0];
    if (g.kind !== 'groups') throw new Error('esperava grupos');
    const g0 = g.groups[0];
    if (g0.kind !== 'de8') throw new Error('esperava grupo de 8');
    expect(g0.matches.UQF1!.format).toBe('MD1');
    expect(g0.matches.USF1!.format).toBe('MD3');
  });

  it('epl24: só os 8 primeiros do ranking entram direto no Stage 2', () => {
    const t = run('epl24', 24, { thirdPlace: true });
    const s1 = t.stages[0];
    if (s1.kind !== 'swiss') throw new Error('esperava suíço');
    expect(s1.seeds.some((id) => ranked.slice(0, 8).includes(id))).toBe(false);
    expect(s1.rounds.flat().every((m) => m.format === 'MD3')).toBe(true);
  });
});
