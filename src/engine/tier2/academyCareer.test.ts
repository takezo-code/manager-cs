import { describe, expect, it } from 'vitest';
import { promote } from '../academy';
import { signAmateur, visibleAmateurs } from '../amateurs';
import { acceptOffer } from '../manager/offers';
import { playerStance } from '../market/negotiation';
import { upgradeScout } from '../scout';
import { createWorld, dailyTick } from '../season';
import { weakestRole } from '../squad';
import type { World } from '../world';
import { academySeasonEnd, markRevealed, recommendPromotion } from './academyCareer';

const academyWorld = (): World => createWorld('furia', 1, undefined, { academy: true });

describe('Manager da academy', () => {
  it('começa na academy: o time principal fica com a IA e a org paga a academy', () => {
    const w = academyWorld();
    expect(w.managerTeamId).toBe('');
    expect(w.manager.academyOf).toBe('furia');
    expect(w.manager.stints[0]).toMatchObject({ teamId: 'furia', academy: true });
    expect(w.manager.goals.map((g) => g.kind)).toEqual(['tier2_top8', 'promover_jovem', 'jovem_cresce5']);
    const cut = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: w.teams.furia.academyIds.slice(0, 4) } } };
    const r = signAmateur(cut, visibleAmateurs(cut)[0].player.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.world.teams.furia.money).toBeLessThan(cut.teams.furia.money);
    const s = upgradeScout(w);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.world.teams.furia.scoutLevel).toBe(2);
  });

  it('recomendar promoção: aceita com vaga e jovem quase tão bom quanto o pior titular', () => {
    let w = academyWorld();
    const id = w.teams.furia.academyIds[0];
    const weak = weakestRole(w.teams.furia, w.players).ovr;
    const good = { ...w.players[id], baseAttributes: Object.fromEntries(Object.keys(w.players[id].baseAttributes).map((k) => [k, weak + 5])) as typeof w.players[typeof id]['baseAttributes'] };
    w = { ...w, players: { ...w.players, [id]: good } };
    const ok = recommendPromotion(w, id);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.world.manager.academyStats?.promoted).toBe(1);
    const bad = { ...w, players: { ...w.players, [id]: { ...good, baseAttributes: Object.fromEntries(Object.keys(good.baseAttributes).map((k) => [k, 40])) as typeof good.baseAttributes } } };
    expect(recommendPromotion(bad, id).ok).toBe(false);
  });

  it('3 metas batidas: proposta do próprio time; aceitar fecha a passagem da academy', () => {
    let w = { ...academyWorld(), date: '2028-01-01' };
    const ac = 'furia-ac';
    const id = w.teams.furia.academyIds[0];
    w = {
      ...w,
      tier2: { ...w.tier2, points: { [ac]: 900 } },
      manager: { ...w.manager, goalsSeason: 2027, academyStats: { promoted: 1, startOvr: { [id]: 40 } } },
    };
    const out = academySeasonEnd(w).world;
    const item = out.inbox.find((i) => i.kind === 'manager_proposta' && i.offerTeamId === 'furia')!;
    expect(item).toBeTruthy();
    const r = acceptOffer(out, item.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.managerTeamId).toBe('furia');
    expect(r.world.manager.academyOf).toBeNull();
    const academyStint = r.world.manager.stints.find((s) => s.academy)!;
    expect(academyStint.to).toBe('2028-01-01');
  });

  it('revelado por você: +10 de satisfação ao subir e −10% na renovação', () => {
    let w = markRevealed(academyWorld());
    const id = w.teams.furia.academyIds[0];
    expect(w.players[id].revealed).toBe(true);
    w = { ...w, players: { ...w.players, [id]: { ...w.players[id], satisfaction: 60 } } };
    const r = promote(w, id);
    if (!r.ok) throw new Error(r.error);
    expect(r.world.players[id].satisfaction).toBe(70);
    const main = { ...r.world, managerTeamId: 'furia' };
    const plain = { ...main, players: { ...main.players, [id]: { ...main.players[id], revealed: false } } };
    const a = playerStance(main, id, 'furia', 'renewal').desired.salary;
    const b = playerStance(plain, id, 'furia', 'renewal').desired.salary;
    expect(a / b).toBeCloseTo(0.9, 1);
  });

  it('um ano de dailyTick como manager da academy roda', () => {
    let w: World = academyWorld();
    for (let i = 0; i < 366; i++) w = dailyTick(w).world;
    expect(w.date >= '2027-11-11').toBe(true);
    expect(w.manager.academyOf === 'furia' || w.managerTeamId === 'furia' || w.manager.stints.length > 1).toBe(true);
  }, 120_000);
});
