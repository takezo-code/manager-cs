import { describe, expect, it } from 'vitest';
import { askingPrice, playerStance } from '../market/negotiation';
import { monthlySatisfaction } from '../morale/satisfaction';
import { SCOUT } from '../config';
import { estimatePotential } from '../scout';
import { createWorld } from '../season';
import type { World } from '../world';
import { managerDealsDay, monthlyManagerGrowth, negotiationDiscount, onYouthPromoted, saleBonus, scoutNarrowing, sponsorBonus } from './effects';
import type { ManagerAttr } from './model';

const withAttr = (w: World, k: ManagerAttr, v: number): World => ({ ...w, manager: { ...w.manager, attrs: { ...w.manager.attrs, [k]: v } } });

describe('Atributos do manager: efeitos', () => {
  const w = { ...createWorld('furia'), date: '2027-01-05' };
  const target = w.teams.mouz.playerIds[0];

  it('manager novo (30 em tudo) não muda nada', () => {
    expect(negotiationDiscount(w)).toBe(0);
    expect(saleBonus(w)).toBe(0);
    expect(sponsorBonus(w)).toBe(0);
    expect(scoutNarrowing(w)).toBe(0);
  });

  it('Negociação 100: −10% no preço pedido nas suas compras; +10% nas propostas pelos seus', () => {
    const base = askingPrice(w, target, 'furia')!;
    const best = askingPrice(withAttr(w, 'NEG', 100), target, 'furia')!;
    expect(best / base).toBeCloseTo(0.9, 1);
    expect(askingPrice(withAttr(w, 'NEG', 100), target, 'vitality')).toBe(askingPrice(w, target, 'vitality'));
    expect(saleBonus(withAttr(w, 'NEG', 100))).toBeCloseTo(0.1);
  });

  it('Finanças 100: patrocínio +15% e salário pedido −8%', () => {
    expect(sponsorBonus(withAttr(w, 'FIN', 100))).toBeCloseTo(0.15);
    const s0 = playerStance(w, target, 'furia', 'transfer').desired.salary;
    const s1 = playerStance(withAttr(w, 'FIN', 100), target, 'furia', 'transfer').desired.salary;
    expect(s1 / s0).toBeCloseTo(0.92, 1);
  });

  it('Olho pra talento 100: faixa do olheiro pela metade', () => {
    const youth = w.players[w.teams.furia.academyIds[0]];
    const wide = estimatePotential(youth, 1);
    const narrow = estimatePotential(youth, 1, scoutNarrowing(withAttr(w, 'TAL', 100)));
    expect(wide.max - wide.min).toBeGreaterThan(narrow.max - narrow.min);
    expect(narrow.max - narrow.min).toBe(2 * Math.round(SCOUT.levels[0].range / 2));
  });

  it('Gestão de vestiário 100: +1,5 de satisfação mensal no seu elenco', () => {
    const id = w.teams.furia.starters[0];
    const w0 = { ...w, players: { ...w.players, [id]: { ...w.players[id], satisfaction: 60 } } };
    const a = monthlySatisfaction(w0).players[id].satisfaction;
    const b = monthlySatisfaction(withAttr(w0, 'VES', 100)).players[id].satisfaction;
    // Satisfação é inteira: +1,5 vira 1 ou 2.
    expect(b - a).toBeGreaterThanOrEqual(1);
    expect(b - a).toBeLessThanOrEqual(2);
  });
});

describe('Atributos do manager: crescimento', () => {
  it('mês com caixa positivo e sem atraso: Finanças +0,3; elenco satisfeito: Vestiário +0,3', () => {
    let w = createWorld('furia');
    const ids = w.teams.furia.playerIds;
    w = { ...w, players: { ...w.players, ...Object.fromEntries(ids.map((id) => [id, { ...w.players[id], satisfaction: 80 }])) } };
    const out = monthlyManagerGrowth(w);
    expect(out.manager.attrs.FIN).toBeCloseTo(30.3);
    expect(out.manager.attrs.VES).toBeCloseTo(30.3);
    const broke = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, money: -1 } } };
    expect(monthlyManagerGrowth(broke).manager.attrs.FIN).toBe(30);
  });

  it('negócio fechado hoje pelo seu time: Negociação +0,5; promoção: Olho +1', () => {
    const w = createWorld('furia');
    const deal = { date: w.date, kind: 'transferencia' as const, playerId: 'x', fromTeamId: 'mouz', toTeamId: 'furia', fee: 500_000 };
    expect(managerDealsDay({ ...w, transferLog: [deal] }).manager.attrs.NEG).toBeCloseTo(30.5);
    expect(managerDealsDay({ ...w, transferLog: [{ ...deal, toTeamId: 'g2' }] }).manager.attrs.NEG).toBe(30);
    expect(onYouthPromoted(w).manager.attrs.TAL).toBe(31);
  });
});
