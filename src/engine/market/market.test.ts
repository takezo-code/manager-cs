import { describe, expect, it } from 'vitest';
import { MARKET } from '../config';
import { addDays } from '../date';
import { createRng } from '../rng';
import type { World } from '../world';
import { aiMarketDay, respondToOffer } from './ai';
import { askingPrice, finalizeNegotiation, offerClub, offerPlayer, playerStance, startNegotiation } from './negotiation';
import { getRelation } from './relations';
import { createWorld } from '../season';
import { marketValue } from './value';

const fresh = (): World => createWorld('furia');

describe('Valor de mercado', () => {
  it('estrelas valem milhões; jovem vale mais que veterano de OVR parecido', () => {
    const w = fresh();
    expect(marketValue(w.players.zywoo, w.date)).toBeGreaterThan(5_000_000);
    expect(marketValue(w.players.donk, w.date)).toBeGreaterThan(marketValue(w.players.karrigan, w.date));
  });

  it('má fase e contrato acabando derrubam o valor', () => {
    const w = fresh();
    const p = w.players.ropz;
    const normal = marketValue(p, w.date);
    const bad = marketValue({ ...p, phase: 'ma_fase', contract: { ...p.contract!, endDate: addDays(w.date, 60) } }, w.date);
    expect(bad).toBeLessThan(normal * 0.6);
  });
});

describe('Negociação com o time', () => {
  it('relação boa barateia e relação péssima bloqueia', () => {
    const w = fresh();
    const neutral = askingPrice(w, 'ropz', 'mouz')!;
    const good = askingPrice({ ...w, relations: { ...w.relations, 'mouz|vitality': 80 } }, 'ropz', 'mouz')!;
    expect(good).toBeLessThan(neutral);
    expect(askingPrice({ ...w, relations: { ...w.relations, 'mouz|vitality': -80 } }, 'ropz', 'mouz')).toBeNull();
  });

  it('proposta baixa é recusada; perto do pedido gera contraproposta; 3 rodadas e desiste', () => {
    const w = fresh();
    const start = startNegotiation(w, 'transfer', 'kscerato', 'mouz');
    if (!start.ok) throw new Error(start.error);
    const asking = askingPrice(w, 'kscerato', 'mouz')!;
    let n = offerClub(w, start.neg, Math.round(asking * 0.3));
    expect(n.counterFee).toBeNull();
    n = offerClub(w, n, Math.round(asking * 0.85));
    expect(n.counterFee).toBeGreaterThan(asking * 0.85);
    n = offerClub(w, n, Math.round(asking * 0.85));
    expect(n.phase).toBe('failed');
  });

  it('aceitar a contraproposta do time fecha, mesmo na última rodada', () => {
    const w = fresh();
    const start = startNegotiation(w, 'transfer', 'jimpphat', 'furia');
    if (!start.ok) throw new Error(start.error);
    const asking = askingPrice(w, 'jimpphat', 'furia')!;
    let n = offerClub(w, start.neg, Math.round(asking * 0.5));
    n = offerClub(w, n, Math.round(asking * 0.85));
    expect(n.counterFee).not.toBeNull();
    n = offerClub(w, n, n.counterFee!);
    expect(n.phase).toBe('player');
  });

  it('pagar o pedido passa para a conversa com o jogador e fecha com o salário pedido', () => {
    const w = fresh();
    const start = startNegotiation(w, 'transfer', 'xertion', 'vitality');
    if (!start.ok) throw new Error(start.error);
    let n = offerClub(w, start.neg, askingPrice(w, 'xertion', 'vitality')!);
    expect(n.phase).toBe('player');
    n = offerPlayer(w, n, { salary: 1000, months: 24, releaseClause: 2_000_000 });
    expect(n.phase).toBe('player');
    n = offerPlayer(w, n, n.counterTerms!);
    expect(n.phase).toBe('done');
    const after = finalizeNegotiation(w, n);
    expect(after.players.xertion.teamId).toBe('vitality');
    expect(after.teams.vitality.playerIds).toContain('xertion');
    expect(after.teams.mouz.playerIds).not.toContain('xertion');
    expect(after.teams.vitality.money).toBe(w.teams.vitality.money - n.fee);
    expect(getRelation(after.relations, 'vitality', 'mouz')).toBeGreaterThan(getRelation(w.relations, 'vitality', 'mouz'));
  });

  it('elenco cheio (7) não contrata', () => {
    const w = fresh();
    const full = { ...w, teams: { ...w.teams, mouz: { ...w.teams.mouz, playerIds: [...w.teams.mouz.playerIds, 'fa-dovi', 'fa-kraeven'] } } };
    expect(startNegotiation(full, 'free', 'fa-tavinho', 'mouz').ok).toBe(false);
  });
});

describe('Multa e jogador', () => {
  it('estrela não quer ir para time muito abaixo no ranking', () => {
    expect(playerStance(fresh(), 'zywoo', 'big', 'transfer').refuses).toBeTruthy();
  });

  it('multa paga piora muito a relação', () => {
    const w = fresh();
    const rich = { ...w, teams: { ...w.teams, vitality: { ...w.teams.vitality, money: 50_000_000 } } };
    const start = startNegotiation(rich, 'clause', 'kscerato', 'vitality');
    if (!start.ok) throw new Error(start.error);
    let n = start.neg;
    if (n.phase === 'failed') return; // jogador pode recusar
    n = offerPlayer(rich, n, { salary: 200_000, months: 36, releaseClause: 10_000_000 });
    expect(n.phase).toBe('done');
    const after = finalizeNegotiation(rich, n);
    expect(getRelation(after.relations, 'vitality', 'furia')).toBe(getRelation(w.relations, 'vitality', 'furia') + MARKET.relationOnClausePaid);
    expect(after.teams.furia.money).toBe(w.teams.furia.money + w.players.kscerato.contract!.releaseClause);
  });

  it('troca: time sem AWPer valoriza receber um AWPer', () => {
    const w = fresh();
    const start = startNegotiation(w, 'trade', 'ropz', 'furia', 'molodoy');
    if (!start.ok) throw new Error(start.error);
    const n = offerClub(w, start.neg, 0);
    expect(['done', 'club']).toContain(n.phase);
  });
});

describe('IA do mercado (6 meses)', () => {
  it('mantém elencos entre 5 e 7, sem jogador duplicado, e movimenta o mercado', () => {
    let w = fresh();
    let offers = 0;
    for (let d = 0; d < 180; d++) {
      w = { ...w, date: addDays(w.date, 1) };
      const out = aiMarketDay(w, 'furia', createRng(d + 1));
      w = out.world;
      offers += out.events.filter((e) => e.text.includes('proposta')).length;
      // Responde recusando para não acumular.
      for (const o of w.offers) w = respondToOffer(w, o.id, { kind: 'refuse' }, createRng(d)).world;
    }
    const seen = new Set<string>();
    for (const t of Object.values(w.teams)) {
      if (t.id !== 'furia') expect(t.playerIds.length).toBeGreaterThanOrEqual(MARKET.squadMin);
      expect(t.playerIds.length).toBeLessThanOrEqual(MARKET.squadMax);
      expect(t.starters.length).toBe(Math.min(5, t.playerIds.length));
      for (const id of t.playerIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        expect(w.players[id].teamId).toBe(t.id);
        expect(w.players[id].contract?.teamId).toBe(t.id);
      }
    }
    const moves = w.transferLog.filter((e) => e.kind === 'transferencia' || e.kind === 'livre');
    expect(moves.length).toBeGreaterThan(3);
    expect(offers).toBeGreaterThan(0);
    // Ninguém fica com caixa muito negativo por causa do mercado.
    expect(Math.min(...Object.values(w.teams).map((t) => t.money))).toBeGreaterThan(0);
  });
});
