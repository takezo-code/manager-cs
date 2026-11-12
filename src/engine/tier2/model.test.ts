import { describe, expect, it } from 'vitest';
import { baseOvr } from '../form';
import { createWorld } from '../season';
import { academyTeamId, tier2PlayersView, tier2Teams } from './model';

describe('Tier 2: times', () => {
  const w = createWorld('furia');

  it('16 times fictícios com 6 jogadores (OVR 62–74, 18–27 anos), fora do mercado do tier 1', () => {
    const teams = Object.values(w.tier2.teams);
    expect(teams).toHaveLength(16);
    for (const t of teams) {
      expect(t.playerIds).toHaveLength(6);
      for (const id of t.playerIds) {
        const p = w.tier2.players[id];
        expect(w.players[id]).toBeUndefined();
        expect(baseOvr(p)).toBeGreaterThanOrEqual(58);
        expect(baseOvr(p)).toBeLessThanOrEqual(78);
        expect(p.age).toBeGreaterThanOrEqual(18);
        expect(p.age).toBeLessThanOrEqual(27);
      }
    }
  });

  it('48 equipes no tier 2: 32 academies + 16 fictícios', () => {
    const all = tier2Teams(w);
    expect(Object.keys(all)).toHaveLength(48);
    expect(all[academyTeamId('furia')].name).toBe('FURIA Academy');
    expect(all[academyTeamId('furia')].starters).toHaveLength(5);
  });

  it('academy com 3 jovens joga com 2 stand-ins amadores', () => {
    const cut = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: w.teams.furia.academyIds.slice(0, 3) } } };
    const t = tier2Teams(cut)[academyTeamId('furia')];
    expect(t.starters).toHaveLength(5);
    const view = tier2PlayersView(cut);
    for (const id of t.starters) expect(view[id]).toBeTruthy();
    expect(t.starters.filter((id) => cut.amateurs.some((a) => a.player.id === id))).toHaveLength(2);
  });
});
