import { describe, expect, it } from 'vitest';
import { promote } from '../academy';
import { signAmateur, visibleAmateurs } from '../amateurs';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';

describe('Correções da revisão do tier 2', () => {
  it('fora de evento, os jovens da academy recuperam energia', () => {
    const w0 = { ...createWorld('furia'), calendar: [] };
    const youth = w0.teams.furia.academyIds[0];
    const tired: World = { ...w0, players: { ...w0.players, [youth]: { ...w0.players[youth], energy: 50 } } };
    expect(dailyTick(tired).world.players[youth].energy).toBeGreaterThan(50);
  });

  it('bônus de revelado só se o manager ainda está na organização', () => {
    const w0 = createWorld('furia');
    const id = w0.teams.furia.academyIds[0];
    const base = { ...w0, players: { ...w0.players, [id]: { ...w0.players[id], revealed: true, satisfaction: 60 } } };
    const here = promote(base, id);
    expect(here.ok && here.world.players[id].satisfaction).toBe(70);
    const gone = promote({ ...base, managerTeamId: 'g2' }, id);
    expect(gone.ok && gone.world.players[id].satisfaction).toBe(60);
  });

  it('jovem contratado no meio da temporada entra na meta de crescimento', () => {
    let w = createWorld('furia', 1, undefined, { academy: true });
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: w.teams.furia.academyIds.slice(0, 4) } } };
    const a = visibleAmateurs(w)[0];
    const r = signAmateur(w, a.player.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.world.manager.academyStats?.startOvr[a.player.id]).toBeDefined();
  });
});
