import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { clubSize } from './board';
import { acceptOffer, askBudget, interestedTeams, makeProposal, monthlyManagerOffers, resign, weeklyUnemployedOffers } from './offers';

const withRep = (w: World, reputation: number): World => ({ ...w, manager: { ...w.manager, reputation } });

describe('Propostas ao manager', () => {
  it('interessados respeitam a reputação', () => {
    const w = createWorld('furia');
    expect(interestedTeams(withRep(w, 10)).every((t) => clubSize(t) === 'pequeno')).toBe(true);
    expect(interestedTeams(withRep(w, 50)).some((t) => clubSize(t) === 'medio')).toBe(true);
    expect(interestedTeams(withRep(w, 50)).some((t) => clubSize(t) === 'grande')).toBe(false);
    expect(interestedTeams(withRep(w, 70)).some((t) => clubSize(t) === 'grande')).toBe(true);
    expect(interestedTeams(w).some((t) => t.id === 'furia')).toBe(false);
  });

  it('empregado: proposta no dia 1º (12%); desempregado: às segundas (35%)', () => {
    const w = createWorld('furia');
    let got = 0;
    for (let i = 0; i < 400; i++) if (monthlyManagerOffers(w, createRng(i)).world.inbox.some((x) => x.kind === 'manager_proposta')) got++;
    expect(got / 400).toBeGreaterThan(0.06);
    expect(got / 400).toBeLessThan(0.2);
    const free = resign(w);
    let got2 = 0;
    for (let i = 0; i < 400; i++) if (weeklyUnemployedOffers(free, createRng(i)).world.inbox.some((x) => x.kind === 'manager_proposta')) got2++;
    expect(got2 / 400).toBeGreaterThan(0.25);
  });

  it('aceitar: assume o novo time como está, com aporte, confiança 60, metas e passagem novas', () => {
    let w = createWorld('furia');
    w = { ...w, inbox: [{ id: 'conversa', kind: 'conversa', playerId: w.teams.furia.playerIds[0], date: w.date, expires: w.date }], manager: { ...w.manager, confidence: 35 } };
    w = makeProposal(w, 'fluxo');
    const item = w.inbox.find((i) => i.kind === 'manager_proposta')!;
    const money = w.teams.fluxo.money;
    const r = acceptOffer(w, item.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.world;
    expect(out.managerTeamId).toBe('fluxo');
    expect(out.inbox).toHaveLength(0);
    expect(out.teams.fluxo.money).toBe(money + 120_000);
    expect(out.manager.confidence).toBe(60);
    expect(out.manager.goals.length).toBe(3);
    expect(out.manager.stints.map((s) => [s.teamId, s.reason])).toEqual([['furia', 'aceitou proposta'], ['fluxo', null]]);
    expect(out.manager.salary).toBe(item.askedSalary);
  });

  it('pedir mais orçamento: aporte e +5 ou −5 (chance = confiança/100)', () => {
    let w = makeProposal(createWorld('furia'), 'fluxo');
    const item = w.inbox[0];
    w = { ...w, manager: { ...w.manager, confidence: 100 } };
    const yes = askBudget(w, item.id, createRng(1));
    expect(yes.world.teams.furia.money).toBeGreaterThan(w.teams.furia.money);
    expect(yes.world.manager.confidence).toBe(100);
    expect(yes.world.inbox).toHaveLength(0);
    const no = askBudget({ ...w, manager: { ...w.manager, confidence: 0 } }, item.id, createRng(1));
    expect(no.world.teams.furia.money).toBe(w.teams.furia.money);
    expect(no.world.manager.confidence).toBe(0);
  });

  it('pedir demissão: fica livre, reputação −5', () => {
    const out = resign(withRep(createWorld('furia'), 30));
    expect(out.managerTeamId).toBe('');
    expect(out.manager.reputation).toBe(25);
    expect(out.manager.stints.at(-1)!.reason).toBe('pediu demissão');
  });

  it('um ano desempregado: o cenário segue e os eventos terminam com campeão', () => {
    let w = resign(createWorld('furia'));
    for (let i = 0; i < 366; i++) w = dailyTick(w).world;
    const done = w.calendar.filter((e) => e.status === 'encerrado');
    expect(done.length).toBeGreaterThan(10);
    expect(done.every((e) => !!e.tournament?.championId)).toBe(true);
    expect(w.date >= '2027-11-11').toBe(true);
  }, 120_000);
});

describe('Correções da revisão', () => {
  it('o time que você deixou não faz proposta no mesmo ano', () => {
    const w = resign(createWorld('fluxo'));
    expect(interestedTeams(w).some((t) => t.id === 'fluxo')).toBe(false);
    const later = { ...w, date: '2027-12-01' };
    expect(interestedTeams(later).some((t) => t.id === 'fluxo')).toBe(true);
  });
});
