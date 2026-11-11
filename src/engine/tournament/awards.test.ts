import { describe, expect, it } from 'vitest';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from '../../data';
import { prizeFor } from '../finance/prizes';
import { effectiveAttributes } from '../player';
import { createWorld } from '../season';
import type { Player, Team } from '../types';
import { expireMvp, grantAwards, pickAwards } from './awards';
import { createTournament, playDay } from './run';
import type { FormatId, FormatOptions, Tournament } from './types';

const teams: Record<string, Team> = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));
const basePlayers: Record<string, Player> = Object.fromEntries(INITIAL_PLAYERS.map((p) => [p.id, p]));
const ranked = [...INITIAL_TEAMS].sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);

function run(format: FormatId, n: number, options: FormatOptions = {}, pool = 1_000_000): Tournament {
  let t = createTournament({ id: format, name: `Evento ${format}`, format, options, prizePool: pool }, ranked.slice(0, n), 9);
  let ps = basePlayers;
  for (let d = 0; d < 80 && !t.championId; d++) {
    const out = playDay(t, teams, ps);
    t = out.tournament;
    ps = out.players;
  }
  return t;
}

describe('Premiação por evento', () => {
  it('Major com US$ 1,25 mi paga 500 mil ao campeão', () => {
    const t = run('major32', 32, {}, 1_250_000);
    expect(prizeFor(t, 'Campeão')).toBe(500_000);
  });

  const cases: Array<[FormatId, number, FormatOptions?]> = [
    ['major32', 32],
    ['groups16', 16, { thirdPlace: true }],
    ['groups16', 16],
    ['swiss16', 16],
    ['epl24', 24, { thirdPlace: true }],
    ['ewc32', 32],
    ['rivals8', 8],
    ['bracket8', 8],
  ];
  for (const [f, n, o] of cases) {
    it(`${f}${o?.thirdPlace ? ' (3º lugar)' : ''}: a soma das premiações fica entre 98% e 100% do pool`, () => {
      const t = run(f, n, o);
      const total = Object.values(t.placements).reduce((s, label) => s + prizeFor(t, label), 0);
      expect(total).toBeGreaterThanOrEqual(980_000);
      expect(total).toBeLessThanOrEqual(1_000_000);
    });
  }
});

describe('MVP e EVPs', () => {
  it('estatísticas de cada jogador são acumuladas no evento', () => {
    const t = run('groups16', 16, { thirdPlace: true });
    const champ = teams[t.championId!].playerIds[0];
    expect(t.playerStats[champ].maps).toBeGreaterThan(0);
    expect(t.playerStats[champ].teamId).toBe(t.championId);
  });

  it('MVP é o maior rating médio entre os times do top 4, com no mínimo 6 mapas', () => {
    const t = run('groups16', 16, { thirdPlace: true });
    const { mvp, evps } = pickAwards(t);
    expect(mvp).toBeTruthy();
    const top4 = Object.entries(t.placements).filter(([, l]) => ['Campeão', 'Vice', '3º', '4º'].includes(l)).map(([id]) => id);
    const avg = (id: string) => t.playerStats[id].ratingSum / t.playerStats[id].maps;
    const eligible = Object.keys(t.playerStats).filter((id) => top4.includes(t.playerStats[id].teamId) && t.playerStats[id].maps >= 6);
    expect(avg(mvp!)).toBe(Math.max(...eligible.map(avg)));
    expect(evps).toHaveLength(4);
    expect(evps).not.toContain(mvp);
  });

  it('o MVP ganha a carta do evento e +2 em todos os atributos por 365 dias', () => {
    const t = run('groups16', 16, { thirdPlace: true });
    let w = createWorld('furia');
    const { mvp } = pickAwards(t);
    const before = effectiveAttributes(w.players[mvp!]).MIR;
    w = grantAwards(w, t);
    const p = w.players[mvp!];
    expect(p.awards.at(-1)).toMatchObject({ kind: 'MVP', event: t.name, date: w.date });
    expect(effectiveAttributes(p).MIR).toBe(before + 2);
    expect(effectiveAttributes(expireMvp(p, '2027-11-11')).MIR).toBe(before + 2);
    expect(effectiveAttributes(expireMvp(p, '2027-11-12')).MIR).toBe(before);
  });
});
