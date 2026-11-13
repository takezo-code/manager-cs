// Kill feed: cada round guarda quem matou quem (para a partida ao vivo), sem mudar a simulação.
import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../match';
import { createWorld } from '../season';

const w = createWorld('furia');
const play = (seed: number) => {
  const [a, b] = [w.teams.furia, w.teams.mouz];
  return simulateMatch({ teamA: a, teamB: b, playersA: a.starters.map((i) => w.players[i]), playersB: b.starters.map((i) => w.players[i]), format: 'MD3', stage: 'grupos', seed });
};

describe('Kill feed', () => {
  it('a simulação não muda: mesmos placares e ratings de antes', () => {
    const fp = (s: number) => {
      const m = play(s);
      return m.maps.map((x) => `${x.map}:${x.score.furia}-${x.score.mouz}`).join(',') + '|' + Object.values(m.ratings).map((v) => v.toFixed(3)).join(',');
    };
    expect([42, 7, 99].map(fp).join(' ## ')).toBe(
      'inferno:13-11,cache:13-4|1.260,1.430,1.190,1.500,0.830,0.770,0.760,1.150,0.950,1.290 ## inferno:16-14,cache:13-1|1.230,1.070,1.500,1.520,1.220,0.710,0.880,0.890,0.740,0.650 ## inferno:14-16,cache:5-13|0.760,0.800,1.170,1.110,0.860,1.440,0.840,1.330,1.340,1.000',
    );
  });

  it('as kills do feed batem com as estatísticas de cada jogador no mapa', () => {
    const m = play(42);
    for (const map of m.maps) {
      const kills: Record<string, number> = {};
      const deaths: Record<string, number> = {};
      for (const r of map.rounds)
        for (const e of r.events)
          if (e.kind === 'kill') {
            kills[e.killer] = (kills[e.killer] ?? 0) + 1;
            deaths[e.victim] = (deaths[e.victim] ?? 0) + 1;
          }
      for (const s of Object.values(map.stats)) {
        expect(kills[s.playerId] ?? 0, s.playerId).toBe(s.kills);
        expect(deaths[s.playerId] ?? 0, s.playerId).toBe(s.deaths);
      }
    }
  });

  it('ninguém morre duas vezes no mesmo round; bomba plantada aparece no feed', () => {
    const m = play(7);
    for (const map of m.maps)
      for (const r of map.rounds) {
        const victims = r.events.filter((e) => e.kind === 'kill').map((e) => (e.kind === 'kill' ? e.victim : ''));
        expect(new Set(victims).size).toBe(victims.length);
        if (r.reason === 'bomba' || r.reason === 'defuse') expect(r.events.some((e) => e.kind === 'plant')).toBe(true);
        if (r.reason === 'defuse') expect(r.events.at(-1)?.kind).toBe('defuse');
      }
  });
});
