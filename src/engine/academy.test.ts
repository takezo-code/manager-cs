import { describe, expect, it } from 'vitest';
import { academyYearEnd, promote } from './academy';
import { payroll } from './finance/monthly';
import { startNegotiation } from './market/negotiation';
import { createWorld } from './season';

describe('Academy', () => {
  it('todo time começa com 5 jovens na academy, fora do elenco principal', () => {
    const w = createWorld('furia');
    for (const t of Object.values(w.teams)) {
      expect(t.academyIds).toHaveLength(5);
      for (const id of t.academyIds) {
        const p = w.players[id];
        expect(p.squad).toBe('academy');
        expect(p.teamId).toBe(t.id);
        expect(p.age).toBeGreaterThanOrEqual(16);
        expect(p.age).toBeLessThanOrEqual(19);
        expect(t.playerIds).not.toContain(id);
        expect(p.potential).toBeGreaterThan(0);
      }
    }
  });

  it('promover leva o jovem ao elenco principal; com 7 no principal dá erro', () => {
    const w = createWorld('furia');
    const id = w.teams.furia.academyIds[0];
    const r = promote(w, id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.playerIds).toContain(id);
    expect(r.world.teams.furia.academyIds).not.toContain(id);
    expect(r.world.players[id].squad).toBe('principal');
    let full = r.world;
    full = { ...full, teams: { ...full.teams, furia: { ...full.teams.furia, playerIds: [...full.teams.furia.playerIds, 'x1'] } } };
    const r2 = promote(full, full.teams.furia.academyIds[0]);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain('cheio');
  });

  it('a folha inclui os salários da academy', () => {
    const w = createWorld('furia');
    const main = w.teams.furia.playerIds.reduce((s, id) => s + w.players[id].contract!.salary, 0);
    const academy = w.teams.furia.academyIds.reduce((s, id) => s + w.players[id].contract!.salary, 0);
    expect(academy).toBeGreaterThan(0);
    expect(payroll(w, w.teams.furia)).toBe(main + academy);
  });

  it('jogador da academy não está à venda', () => {
    const w = { ...createWorld('furia'), date: '2027-01-05' };
    const r = startNegotiation(w, 'transfer', w.teams.vitality.academyIds[0], 'furia');
    expect(r.ok).toBe(false);
  });

  it('virada do ano: quem tem 20 anos sai da academy; a IA repõe até 5', () => {
    let w = createWorld('furia');
    const mine = w.teams.furia.academyIds[0];
    const theirs = w.teams.big.academyIds[0];
    w = { ...w, players: { ...w.players, [mine]: { ...w.players[mine], age: 20 }, [theirs]: { ...w.players[theirs], age: 20 } } };
    const out = academyYearEnd(w);
    expect(out.world.players[mine].teamId).toBeNull();
    expect(out.world.teams.furia.academyIds).not.toContain(mine);
    expect(out.events.some((e) => e.text.includes(w.players[mine].nick))).toBe(true);
    expect(out.world.teams.big.academyIds).not.toContain(theirs);
    expect(out.world.teams.big.academyIds).toHaveLength(5);
  });
});
