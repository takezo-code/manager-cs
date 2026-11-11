import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../../data';
import type { Player, Team } from '../types';
import { allSeries, createLegacyTournament as createTournament, playDay, type TournamentTemplate } from './run';
import type { Tournament } from './types';

const teams: Record<string, Team> = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));
const basePlayers: Record<string, Player> = Object.fromEntries(INITIAL_PLAYERS.map((p) => [p.id, p]));

function runAll(template: TournamentTemplate, seed: number) {
  let t: Tournament = createTournament(template, INITIAL_TEAMS, seed);
  let players = basePlayers;
  let days = 0;
  while (!t.championId && days < 60) {
    const out = playDay(t, teams, players);
    t = out.tournament;
    players = out.players;
    days++;
  }
  return { t, players, days };
}

describe('Major (suíço + playoffs)', () => {
  const { t, players, days } = runAll('major', 1);

  it('termina com campeão e todos os 32 times colocados', () => {
    expect(t.championId).toBeTruthy();
    expect(Object.keys(t.placements)).toHaveLength(32);
    expect(Object.values(t.placements).filter((p) => p === 'Campeão')).toHaveLength(1);
    expect(Object.values(t.placements).filter((p) => p === 'Vice')).toHaveLength(1);
    expect(days).toBeLessThanOrEqual(5 * 3 + 3);
  });

  it('cada fase suíça classifica 8 com 3 vitórias, sem revanche', () => {
    for (const s of t.stages) {
      if (s.kind !== 'swiss') continue;
      const recs = Object.values(s.records);
      expect(recs.filter((r) => r.w === 3)).toHaveLength(8);
      expect(recs.filter((r) => r.l === 3)).toHaveLength(8);
      for (const r of recs) expect(new Set(r.opponents).size).toBe(r.opponents.length);
    }
  });

  it('MD1 só nos jogos que não classificam nem eliminam; Stage 3 tudo MD3; final MD5', () => {
    const [s1, , s3, po] = t.stages;
    if (s1.kind !== 'swiss' || s3.kind !== 'swiss' || po.kind !== 'bracket') throw new Error('estrutura');
    for (const m of s1.rounds[0]) expect(m.format).toBe('MD1');
    expect(s3.rounds.flat().every((m) => m.format === 'MD3')).toBe(true);
    expect(po.slots.at(-1)!.series!.format).toBe('MD5');
    expect(allSeries(t).every((m) => m.winnerId && m.score)).toBe(true);
  });

  it('top 8 do ranking só entra no Stage 3', () => {
    const top8 = t.participants.slice(0, 8);
    const s1 = t.stages[0];
    if (s1.kind !== 'swiss') throw new Error();
    expect(s1.seeds.some((id) => top8.includes(id))).toBe(false);
  });

  it('jogadores gastam energia e mudam de fase', () => {
    const ps = Object.values(players);
    expect(ps.some((p) => p.energy < 100)).toBe(true);
    expect(ps.some((p) => p.phase !== 'normal')).toBe(true);
    expect(ps.every((p) => p.recentRatings.length <= 8)).toBe(true);
  });

  it('é determinístico com a mesma semente', () => {
    expect(runAll('major', 1).t).toEqual(t);
  });
});

describe('IEM (grupos dupla eliminação + playoffs)', () => {
  const { t } = runAll('iem', 7);

  it('16 participantes, 2 grupos de 8 e campeão', () => {
    expect(t.participants).toHaveLength(16);
    const g = t.stages[0];
    if (g.kind !== 'groups') throw new Error();
    expect(g.groups.map((x) => x.seeds.length)).toEqual([8, 8]);
    expect(t.championId).toBeTruthy();
    expect(Object.keys(t.placements)).toHaveLength(16);
  });

  it('cada grupo tem 12 jogos, todos MD3', () => {
    const g = t.stages[0];
    if (g.kind !== 'groups') throw new Error();
    for (const grp of g.groups) {
      const ms = Object.values(grp.matches);
      expect(ms).toHaveLength(12);
      expect(ms.every((m) => m!.format === 'MD3')).toBe(true);
    }
  });

  it('1º do grupo vai direto para a semi', () => {
    const g = t.stages[0];
    const po = t.stages[1];
    if (g.kind !== 'groups' || po.kind !== 'bracket') throw new Error();
    const g0 = g.groups[0];
    if (g0.kind !== 'de8') throw new Error();
    const a1 = g0.matches.UF!.winnerId;
    expect(po.slots.find((s) => s.id === 'SF1')!.a).toEqual({ team: a1 });
  });
});

describe('Correções do code review (suíço)', () => {
  it('time eliminado no suíço já tem colocação no dia em que cai', () => {
    let t: Tournament = createTournament('major', INITIAL_TEAMS, 2);
    let players = basePlayers;
    for (let d = 0; d < 5; d++) {
      const out = playDay(t, teams, players);
      t = out.tournament;
      players = out.players;
      const s1 = t.stages[0];
      if (s1.kind !== 'swiss') throw new Error();
      for (const [id, r] of Object.entries(s1.records)) if (r.l === 3) expect(t.placements[id], `dia ${d + 1}: ${id}`).toBeTruthy();
    }
  });
});
