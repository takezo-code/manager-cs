import { describe, expect, it } from 'vitest';
import { academyYearEnd, promote } from './academy';
import { payroll } from './finance/monthly';
import { startNegotiation } from './market/negotiation';
import { createWorld, dailyTick } from './season';

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
    const staff = Object.values(w.teams.furia.staff).reduce((s, id) => s + (id ? w.staff[id].contract!.salary : 0), 0);
    expect(payroll(w, w.teams.furia)).toBe(main + academy + staff);
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

describe('Academy na temporada (dailyTick)', () => {
  const at = (date: string) => ({ ...createWorld('furia'), date, calendar: [] });

  it('no dia 1º: crescimento mensal dos jovens e troca de parte da GC/FACEIT', () => {
    const before = at('2027-02-28');
    const id = before.teams.furia.academyIds[0];
    const out = dailyTick(before).world;
    expect(out.players[id].growth).not.toEqual(before.players[id].growth);
    expect(out.amateurs.map((a) => a.player.id)).not.toEqual(before.amateurs.map((a) => a.player.id));
  });

  it('segunda-feira de março: rodada da liga de base', () => {
    const out = dailyTick(at('2027-03-07')).world;
    expect(out.baseLeague.lastRound).toHaveLength(51);
  });

  it('1º de janeiro: todos fazem aniversário e a liga de base recomeça', () => {
    const before = at('2027-12-31');
    const vet = Object.values(before.players).find((p) => p.squad === 'principal' && p.teamId)!;
    const out = dailyTick({ ...before, baseLeague: { season: 2027, table: { furia: { w: 3, l: 1 } }, lastRound: [] } }).world;
    expect(out.players[vet.id].age).toBe(vet.age + 1);
    expect(out.baseLeague.season).toBe(2028);
    expect(out.baseLeague.table).toEqual({});
  });

  it('1º de dezembro: aviso de quem vai fazer 20 anos', () => {
    let w = at('2027-11-30');
    const id = w.teams.furia.academyIds[0];
    w = { ...w, players: { ...w.players, [id]: { ...w.players[id], age: 19 } } };
    expect(dailyTick(w).events.some((e) => e.text.includes('faz 20 anos'))).toBe(true);
  });
});

describe('Correções da revisão', () => {
  it('jovem que sai do time (fim de contrato) deixa a academy de verdade', async () => {
    const { releasePlayer } = await import('./market/transfer');
    const w = createWorld('furia');
    const id = w.teams.furia.academyIds[0];
    const out = releasePlayer(w, id, 'fim_contrato');
    expect(out.teams.furia.academyIds).not.toContain(id);
    expect(out.players[id].squad).toBe('principal');
    expect(out.players[id].teamId).toBeNull();
  });

  it('IA com elenco incompleto promove o jovem de 20 anos em vez de dispensar', () => {
    let w = createWorld('furia');
    const ai = Object.keys(w.teams).find((id) => id !== 'furia')!;
    const t = w.teams[ai];
    const id = t.academyIds[0];
    w = {
      ...w,
      date: '2028-01-01',
      teams: { ...w.teams, [ai]: { ...t, playerIds: t.playerIds.slice(0, 4), starters: t.starters.filter((x) => t.playerIds.slice(0, 4).includes(x)) } },
      players: { ...w.players, [id]: { ...w.players[id], age: 20 } },
    };
    const out = academyYearEnd(w).world;
    expect(out.teams[ai].playerIds).toContain(id);
  });

  it('na virada do ano os amadores também envelhecem e quem passou de 19 sai do banco', async () => {
    const { ageUp } = await import('./development');
    const w = createWorld('furia');
    const out = ageUp(w);
    for (const a of out.amateurs) expect(a.player.age).toBeLessThanOrEqual(19);
    const kept = w.amateurs.filter((a) => a.player.age < 19);
    expect(out.amateurs).toHaveLength(kept.length);
    expect(out.amateurs[0].player.age).toBe(kept[0].player.age + 1);
  });
});

describe('Contrato da academy', () => {
  it('renova sozinho com o mesmo salário quando acaba (seu time e IA)', async () => {
    const { aiMarketDay } = await import('./market/ai');
    const { createRng } = await import('./rng');
    let w = { ...createWorld('furia'), date: '2028-12-01' };
    const ai = Object.keys(w.teams).find((id) => id !== 'furia')!;
    const ids = [w.teams.furia.academyIds[0], w.teams[ai].academyIds[0]];
    const players = { ...w.players };
    for (const id of ids) players[id] = { ...players[id], contract: { ...players[id].contract!, endDate: '2028-11-30' } };
    w = { ...w, players };
    const out = aiMarketDay(w, 'furia', createRng(1)).world;
    for (const id of ids) {
      expect(out.players[id].teamId).not.toBeNull();
      expect(out.players[id].contract!.endDate > '2028-12-01').toBe(true);
      expect(out.players[id].contract!.salary).toBe(w.players[id].contract!.salary);
    }
  });
});
