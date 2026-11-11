import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../data';
import { simulateMatch, type MatchInput } from './match';
import { playerOvr } from './player';
import type { MatchFormat, Team } from './types';

const team = (id: string) => INITIAL_TEAMS.find((t) => t.id === id)!;
const roster = (t: Team) => t.playerIds.map((id) => INITIAL_PLAYERS.find((p) => p.id === id)!);

const input = (a: string, b: string, seed: number, format: MatchFormat = 'MD1'): MatchInput => ({
  teamA: team(a),
  teamB: team(b),
  playersA: roster(team(a)),
  playersB: roster(team(b)),
  format,
  stage: 'grupos',
  seed,
});

describe('Simulação de partida', () => {
  it('é determinística com a mesma semente', () => {
    const r1 = simulateMatch(input('furia', 'vitality', 42));
    const r2 = simulateMatch(input('furia', 'vitality', 42));
    expect(r1).toEqual(r2);
  });

  it('placar respeita MR12 e prorrogação MR3', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = simulateMatch(input('mouz', 'spirit', seed));
      const m = r.maps[0];
      const [a, b] = Object.values(m.score);
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      if (m.overtimes === 0) {
        expect(hi).toBe(13);
        expect(lo).toBeLessThanOrEqual(11);
      } else {
        expect(hi).toBe(12 + 3 * (m.overtimes - 1) + 4);
        expect(hi - lo).toBeGreaterThanOrEqual(1);
      }
      expect(m.rounds.length).toBe(a + b);
    }
  });

  it('veto MD1 bane 6 e sobra 1; MD3 joga 2 ou 3 mapas', () => {
    const md1 = simulateMatch(input('furia', 'navi', 7));
    expect(md1.veto.filter((v) => v.action === 'ban')).toHaveLength(6);
    expect(md1.maps).toHaveLength(1);
    const md3 = simulateMatch(input('furia', 'navi', 7, 'MD3'));
    expect(md3.maps.length).toBeGreaterThanOrEqual(2);
    expect(md3.maps.length).toBeLessThanOrEqual(3);
    expect(Math.max(...Object.values(md3.mapScore))).toBe(2);
  });

  it('kills de um time = mortes do outro', () => {
    const r = simulateMatch(input('falcons', 'aurora', 99));
    const m = r.maps[0];
    const sum = (ids: string[], k: 'kills' | 'deaths') => ids.reduce((s, id) => s + m.stats[id][k], 0);
    expect(sum(team('falcons').playerIds, 'kills')).toBe(sum(team('aurora').playerIds, 'deaths'));
    expect(sum(team('aurora').playerIds, 'kills')).toBe(sum(team('falcons').playerIds, 'deaths'));
  });

  it('time mais forte vence mais, sem ser garantido', () => {
    const avgOvr = (id: string) => roster(team(id)).reduce((s, p) => s + playerOvr(p), 0) / 5;
    expect(avgOvr('vitality')).toBeGreaterThan(avgOvr('mongolz'));
    let wins = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) if (simulateMatch(input('vitality', 'mongolz', seed)).winnerTeamId === 'vitality') wins++;
    const rate = wins / N;
    expect(rate).toBeGreaterThan(0.55);
    expect(rate).toBeLessThan(0.9);
  });

  it('ratings ficam numa faixa realista', () => {
    const all: number[] = [];
    for (let seed = 1; seed <= 100; seed++) all.push(...Object.values(simulateMatch(input('furia', 'mouz', seed)).ratings));
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    expect(mean).toBeGreaterThan(0.9);
    expect(mean).toBeLessThan(1.15);
  });
});

describe('Correções do code review (prorrogação)', () => {
  it('cada prorrogação começa com os times no lado em que terminaram', () => {
    let checked = 0;
    for (let seed = 1; seed <= 400 && checked < 3; seed++) {
      const m = simulateMatch(input('mouz', 'furia', seed)).maps[0];
      if (m.overtimes < 1) continue;
      checked++;
      // Round 25 (1º da OT1) com o mesmo CT do round 24; idem para o início de cada OT seguinte.
      for (let start = 25; start <= m.rounds.length; start += 6)
        expect(m.rounds[start - 1].ctTeamId, `seed ${seed}, round ${start}`).toBe(m.rounds[start - 2].ctTeamId);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
