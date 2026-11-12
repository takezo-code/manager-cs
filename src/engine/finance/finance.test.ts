import { describe, expect, it } from 'vitest';
import { MORALE } from '../config';
import { addDays } from '../date';
import { giveRaise, proposeCut, respondInbox, monthlyRequests } from '../morale/conversations';
import { bandOf, monthlySatisfaction } from '../morale/satisfaction';
import { createRng } from '../rng';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { monthlyFinance, payroll, sponsorIncome } from './monthly';
import { placeNumber, prizeFor } from './prizes';
import { acceptSponsor, freeSlots } from './sponsors';

const at = (w: World, date: string): World => ({ ...w, date });

describe('Fechamento do mês', () => {
  it('patrocínio entra, folha sai e tudo vai para o extrato', () => {
    const w = at(createWorld('furia'), '2026-12-01');
    const before = w.teams.furia.money;
    const out = monthlyFinance(w, createRng(1)).world;
    const expected = before + sponsorIncome(w.teams.furia, w.date) - payroll(w, w.teams.furia);
    expect(out.teams.furia.money).toBe(expected);
    expect(out.ledger.some((e) => e.category === 'salarios' && e.amount < 0)).toBe(true);
    expect(out.ledger.some((e) => e.category === 'patrocinio' && e.amount > 0)).toBe(true);
    expect(out.sponsorOffers.length).toBeGreaterThan(0);
  });

  it('sem dinheiro, salários atrasam, satisfação cai e depois são quitados', () => {
    let w = at(createWorld('furia'), '2026-12-01');
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, money: -1_000_000, sponsors: [] } } };
    const sat = w.players.fallen.satisfaction;
    w = monthlyFinance(w, createRng(1)).world;
    expect(w.teams.furia.lateMonths).toBe(1);
    expect(w.teams.furia.arrears).toBeGreaterThan(0);
    expect(w.players.fallen.satisfaction).toBe(sat + MORALE.monthly.lateSalary);
    w = { ...at(w, '2027-01-01'), teams: { ...w.teams, furia: { ...w.teams.furia, money: 10_000_000 } } };
    w = monthlyFinance(w, createRng(2)).world;
    expect(w.teams.furia.lateMonths).toBe(0);
    expect(w.teams.furia.arrears).toBe(0);
  });

  it('master só um; comuns até 3', () => {
    const w = createWorld('furia');
    const slots = freeSlots(w.teams.furia, w.date);
    expect(slots.master).toBe(false);
    expect(slots.regular).toBe(1);
    const offer = { id: 'x', brand: 'Teste', slot: 'master' as const, monthly: 1, months: 6, endDate: '2027-06-30', titleBonus: 0, expires: '2026-12-01' };
    const r = acceptSponsor({ ...w, sponsorOffers: [offer] }, 'x');
    expect(r.ok).toBe(false);
  });
});

const MAJOR = { format: 'major32' as const, prizePool: 1_250_000 };
const IEM = { format: 'groups16' as const, prizePool: 1_250_000 };

describe('Premiação real', () => {
  it('Major e IEM pagam por colocação', () => {
    expect(prizeFor(MAJOR, 'Campeão')).toBe(500_000);
    expect(prizeFor(MAJOR, '5º–8º')).toBe(45_000);
    expect(prizeFor(MAJOR, '12º–14º')).toBe(20_000);
    expect(prizeFor(MAJOR, '17º–19º')).toBe(10_000);
    expect(prizeFor(MAJOR, '25º–27º')).toBe(0);
    expect(prizeFor(IEM, 'Vice')).toBe(210_000);
    expect(prizeFor(IEM, '13º–16º')).toBe(4_000);
    expect(placeNumber('3º–4º')).toBe(3);
  });
});

describe('Satisfação', () => {
  it('reserva perde satisfação todo mês; titular não', () => {
    let w = createWorld('furia');
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, starters: w.teams.furia.starters.filter((id) => id !== 'yuurih') } } };
    const before = w.players.yuurih.satisfaction;
    w = monthlySatisfaction(w);
    expect(w.players.yuurih.satisfaction).toBeLessThan(before);
  });

  it('faixas', () => {
    expect(bandOf(80)).toBe('satisfeito');
    expect(bandOf(50)).toBe('incomodado');
    expect(bandOf(30)).toBe('insatisfeito');
    expect(bandOf(10)).toBe('quer_sair');
  });

  it('salário baixo gera pedido de aumento; recusar duas vezes irrita', () => {
    let w = createWorld('furia');
    const p = w.players.kscerato;
    w = { ...w, players: { ...w.players, kscerato: { ...p, contract: { ...p.contract!, salary: 5_000 } } } };
    w = monthlyRequests(w).world;
    const item = w.inbox.find((i) => i.playerId === 'kscerato' && i.kind === 'aumento');
    expect(item).toBeTruthy();
    const sat = w.players.kscerato.satisfaction;
    w = respondInbox(w, item!.id, { kind: 'recusar' }).world;
    expect(w.players.kscerato.satisfaction).toBe(sat + MORALE.events.raiseRefused);
    expect(w.players.kscerato.mood.raiseRefusals).toBe(1);
  });

  it('aumento por iniciativa vale mais e perde força se repetido logo', () => {
    let w = createWorld('furia');
    w = { ...w, players: { ...w.players, fallen: { ...w.players.fallen, satisfaction: 40 } } };
    w = giveRaise(w, 'fallen', 20).world;
    const first = w.players.fallen.satisfaction - 40;
    const s2 = w.players.fallen.satisfaction;
    w = giveRaise(w, 'fallen', 20).world;
    expect(w.players.fallen.satisfaction - s2).toBeLessThan(first);
  });

  it('insatisfeito pede conversa; prometer titularidade e quebrar a promessa custa caro', () => {
    let w = createWorld('furia');
    w = { ...w, players: { ...w.players, yuurih: { ...w.players.yuurih, satisfaction: 35 } } };
    w = monthlyRequests(w).world;
    const item = w.inbox.find((i) => i.playerId === 'yuurih')!;
    expect(item.kind).toBe('conversa');
    w = respondInbox(w, item.id, { kind: 'prometer' }).world;
    expect(w.players.yuurih.mood.promiseUntil).toBeTruthy();
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, starters: w.teams.furia.starters.filter((id) => id !== 'yuurih') } } };
    // Comissão neutra (Gestão 70, Motivação 40): só a promessa quebrada conta.
    const staff = { ...w.staff };
    for (const id of Object.values(w.teams.furia.staff)) {
      const s = staff[id!];
      staff[id!] = { ...s, attrs: { ...s.attrs, ...(s.role === 'tecnico' ? { GES: 70 } : s.role === 'psicologo' ? { MOT: 40 } : {}) } };
    }
    w = { ...w, staff };
    const before = w.players.yuurih.satisfaction;
    w = monthlySatisfaction(w);
    expect(w.players.yuurih.satisfaction).toBe(before + MORALE.monthly.brokenPromise);
  });

  it('negar saída: fica, rende menos, não renova; colegas sentem', () => {
    let w = createWorld('furia');
    w = { ...w, players: { ...w.players, molodoy: { ...w.players.molodoy, satisfaction: 15 } } };
    w = monthlyRequests(w).world;
    const item = w.inbox.find((i) => i.playerId === 'molodoy')!;
    expect(item.kind).toBe('saida');
    const mate = w.players.fallen.satisfaction;
    w = respondInbox(w, item.id, { kind: 'negar' }).world;
    expect(w.players.molodoy.mood.exitDenied).toBe(true);
    expect(w.players.fallen.satisfaction).toBeLessThan(mate);
  });

  it('redução coletiva em crise é mais aceita que individual em boa fase', () => {
    let crisis = createWorld('furia');
    crisis = { ...crisis, teams: { ...crisis.teams, furia: { ...crisis.teams.furia, money: -100_000, lateMonths: 1 } } };
    let acceptedCollective = 0;
    let acceptedSolo = 0;
    for (let s = 0; s < 40; s++) {
      acceptedCollective += proposeCut(crisis, crisis.teams.furia.playerIds, 10, createRng(s)).accepted.length;
      const happy = { ...crisis.players.kscerato, phase: 'destaque' as const };
      const calm = { ...createWorld('furia'), players: { ...crisis.players, kscerato: happy } };
      acceptedSolo += proposeCut(calm, ['kscerato'], 30, createRng(s)).accepted.length;
    }
    expect(acceptedCollective / 5).toBeGreaterThan(acceptedSolo * 2);
  }, 30_000);
});

describe('Um ano de jogo', () => {
  it('a economia não quebra todo mundo nem infla sem limite', () => {
    let w = createWorld('furia', 3);
    for (let d = 0; d < 365; d++) w = dailyTick(w).world;
    expect(w.date).toBe(addDays('2026-11-11', 365));
    const teams = Object.values(w.teams);
    // Até ~1 em cada 8 times com salário atrasado depois de um ano (102 times, com o circuito tier 2/3).
    expect(teams.filter((t) => t.lateMonths > 0).length).toBeLessThan(teams.length / 8);
    expect(Math.max(...teams.map((t) => t.money))).toBeLessThan(20_000_000);
  }, 30_000);
});

describe('Fim de campeonato', () => {
  it('paga premiação real, bônus de título e mexe na satisfação', async () => {
    const { playDay } = await import('../tournament/run');
    const { createLegacyTournament: createTournament } = await import('../tournament/legacy.testutil');
    const { awardTournament } = await import('./prizes');
    let w = createWorld('furia');
    let t = createTournament('iem', Object.values(w.teams), 11);
    let players = w.players;
    while (!t.championId) {
      const out = playDay(t, w.teams, players);
      t = out.tournament;
      players = out.players;
    }
    w = { ...w, players };
    const champ = t.championId!;
    const before = w.teams[champ].money;
    const bonus = w.teams[champ].sponsors.reduce((s, x) => s + x.titleBonus, 0);
    const sat = w.players[w.teams[champ].playerIds[0]].satisfaction;
    w = awardTournament(w, t);
    expect(w.teams[champ].money).toBe(before + 360_000 + bonus);
    expect(w.players[w.teams[champ].playerIds[0]].satisfaction).toBeGreaterThan(sat);
  });
});

describe('Correções do code review', () => {
  it('durante campeonato, o atraso de salário não tira jogadores do elenco', async () => {
    const { dailyTick } = await import('../season');
    const { createLegacyTournament } = await import('../tournament/legacy.testutil');
    let w = at(createWorld('furia'), '2026-11-30');
    // O Major está em andamento com a BIG participando.
    const major = w.calendar.find((e) => e.templateId === 'major-2')!;
    const tournament = createLegacyTournament('major', Object.values(w.teams), 1);
    w = { ...w, calendar: w.calendar.map((e) => (e.id === major.id ? { ...e, status: 'em_andamento' as const, tournament } : e)) };
    const big = w.teams.fluxo;
    w = { ...w, teams: { ...w.teams, fluxo: { ...big, money: -5_000_000, sponsors: [], lateMonths: 2 } } };
    for (const id of big.playerIds) w = { ...w, players: { ...w.players, [id]: { ...w.players[id], satisfaction: 10 } } };
    const out = dailyTick(w).world;
    expect(out.date).toBe('2026-12-01');
    expect(out.teams.fluxo.lateMonths).toBe(3);
    expect(out.teams.fluxo.playerIds).toHaveLength(big.playerIds.length);
  });

  it('fora de campeonato, os dias de descanso recuperam energia', async () => {
    const { dailyTick } = await import('../season');
    let w = createWorld('furia');
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, training: { mode: 'descanso', focus: 'mira' } } } };
    w = { ...w, players: { ...w.players, fallen: { ...w.players.fallen, energy: 50 } } };
    const out = dailyTick(w).world;
    expect(out.players.fallen.energy).toBeGreaterThan(50);
  });
});
