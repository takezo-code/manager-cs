// Negociação em duas etapas (dupla aprovação): primeiro o time aceita a proposta, depois o jogador aceita ir.
// Cada etapa tem até 3 rodadas com contraproposta. As decisões são determinísticas (sem sorte).
import { windowOpen } from '../calendar';
import { MARKET } from '../config';
import { endOfMonthAfter } from '../date';
import { baseOvr } from '../form';
import { playerOvr } from '../player';
import { roleCount, starterOvrAt, wouldStart } from '../squad';
import type { Contract, Player } from '../types';
import type { World } from '../world';
import { changeRelation, getRelation } from './relations';
import { executeRenewal, executeTrade, executeTransfer } from './transfer';
import { bandOf } from '../morale/satisfaction';
import { marketValue, regionOf, salaryForOvr } from './value';
import { fmtMoney, roundTo } from '../format';

export type DealKind = 'transfer' | 'clause' | 'free' | 'renewal' | 'trade';

export interface Terms {
  salary: number;
  months: number;
  releaseClause: number;
}

export interface NegMessage {
  from: 'voce' | 'time' | 'jogador';
  text: string;
}

export interface Negotiation {
  kind: DealKind;
  playerId: string;
  buyerId: string;
  sellerId: string | null;
  phase: 'club' | 'player' | 'done' | 'failed';
  clubRound: number;
  playerRound: number;
  /** Taxa acertada com o time (ou a multa). */
  fee: number;
  /** Troca: jogador oferecido e dinheiro extra (positivo: você paga). */
  tradePlayerId: string | null;
  tradeMoney: number;
  counterFee: number | null;
  counterTerms: Terms | null;
  messages: NegMessage[];
}


// ---------- Lado do time vendedor ----------

/** Quanto o time pede pelo jogador. null = não negocia (relação péssima). */
export function askingPrice(w: World, playerId: string, buyerId: string): number | null {
  const p = w.players[playerId];
  if (!p.teamId) return 0;
  const seller = w.teams[p.teamId];
  const rel = getRelation(w.relations, buyerId, seller.id);
  if (rel <= MARKET.blockedRelation) return null;
  let price = marketValue(p, w.date);
  if (seller.starters.includes(playerId)) price *= 1 + MARKET.starterPremium;
  if (roleCount(seller, w.players, p.role) === 1) price *= 1 + MARKET.onlyRolePremium;
  if (p.transferListed) price *= 1 - MARKET.listedDiscount;
  // Relação boa barateia; ruim encarece (±25%).
  price *= 1 - rel / 400;
  return roundTo(price, 10_000);
}

/** Quanto o time vendedor considera que vale o jogador oferecido numa troca. */
export function tradeValueFor(w: World, sellerId: string, offeredId: string): number {
  const seller = w.teams[sellerId];
  const offered = w.players[offeredId];
  let v = marketValue(offered, w.date);
  // Precisa da função: valoriza mais (time sem AWPer valoriza receber um AWPer).
  const has = roleCount(seller, w.players, offered.role);
  if (has === 0) v *= 1.3;
  else if (playerOvr(offered) > starterOvrAt(seller, w.players, offered.role)) v *= 1.1;
  return roundTo(v, 10_000);
}

// ---------- Lado do jogador ----------

export interface PlayerStance {
  /** Recusa de cara, com o motivo. */
  refuses: string | null;
  desired: Terms;
  minMonths: number;
}

/** O que o jogador quer para assinar com o time comprador. */
export function playerStance(w: World, playerId: string, buyerId: string, kind: DealKind): PlayerStance {
  const p = w.players[playerId];
  const buyer = w.teams[buyerId];
  const current = p.teamId ? w.teams[p.teamId] : null;
  const ovr = baseOvr(p);
  const value = marketValue(p, w.date);
  let salary = salaryForOvr(ovr);
  let refuses: string | null = null;

  if (kind !== 'renewal') {
    const refRank = current?.hltvRank ?? 20;
    const diff = buyer.hltvRank - refRank; // positivo = time comprador pior
    salary *= diff > 0 ? 1 + 0.02 * Math.min(diff, 20) : 1 - 0.01 * Math.min(-diff, 10);
    if (!wouldStart(buyer, w.players, p)) salary *= 1.3;
    if (regionOf(p.country) !== buyer.region) salary *= 1 + (1 - p.regionFlex) * 0.4;
    if (current && p.contract) salary = Math.max(salary, p.contract.salary * 1.05); // não troca de time para ganhar menos
    if (ovr >= 85 && diff > 12) refuses = `${p.nick} não tem interesse em jogar num time tão abaixo no ranking.`;
    if (kind === 'clause' && p.satisfaction >= 70 && diff > 0)
      refuses = `${p.nick} está feliz em ${current?.shortName} e não quer sair para um time mais fraco.`;
  } else {
    if (p.mood.exitDenied) refuses = `${p.nick} não renova: você negou a saída dele.`;
    else if (bandOf(p.satisfaction) === 'quer_sair') refuses = `${p.nick} quer sair e se recusa a renovar.`;
    salary = Math.max(salary, p.contract?.salary ?? 0);
    if (p.satisfaction >= 70) salary *= 0.95; // satisfeito renova mais fácil
  }

  const minMonths = p.age >= 30 ? 24 : 6;
  const releaseClause = roundTo(value * 2, 50_000);
  return { refuses, desired: { salary: roundTo(salary, 500), months: Math.max(minMonths, 24), releaseClause }, minMonths };
}

/** Salário exigido para uma multa: multa alta = salário maior; multa baixa = um pouco menor. */
function salaryForClause(base: number, clause: number, value: number): number {
  const ratio = clause / Math.max(1, value);
  return base * (1 + Math.max(0, ratio - 2) * 0.1) * (1 - Math.max(0, 2 - ratio) * 0.05);
}

// ---------- Fluxo ----------

/** Fora da janela de transferências só valem agentes livres e renovações. */
export const dealAllowed = (kind: DealKind, date: string) => kind === 'free' || kind === 'renewal' || windowOpen(date);

export function startNegotiation(
  w: World,
  kind: DealKind,
  playerId: string,
  buyerId: string,
  tradePlayerId: string | null = null,
): { ok: true; neg: Negotiation } | { ok: false; error: string } {
  const p = w.players[playerId];
  const buyer = w.teams[buyerId];
  if (kind === 'renewal') {
    if (p.teamId !== buyerId) return { ok: false, error: 'Só dá para renovar com jogadores do seu time.' };
  } else {
    if (p.teamId === buyerId) return { ok: false, error: 'O jogador já é do seu time.' };
    if (kind !== 'trade' && buyer.playerIds.length >= MARKET.squadMax) return { ok: false, error: `Seu elenco já tem ${MARKET.squadMax} jogadores.` };
  }
  if (kind === 'free' && p.teamId) return { ok: false, error: 'O jogador tem contrato com outro time.' };
  if (!dealAllowed(kind, w.date))
    return { ok: false, error: 'Mercado fechado: fora da janela de transferências (1–20 jan e 22 jun–10 ago). Só agentes livres e renovações.' };
  if (kind === 'trade') {
    if (!p.teamId) return { ok: false, error: 'Agente livre não entra em troca.' };
    if (!tradePlayerId || w.players[tradePlayerId].teamId !== buyerId) return { ok: false, error: 'Escolha um jogador seu para a troca.' };
  }
  if (kind === 'clause') {
    const clause = p.contract?.releaseClause ?? 0;
    if (buyer.money < clause) return { ok: false, error: 'Dinheiro insuficiente para pagar a multa.' };
  }
  if (kind === 'transfer' || kind === 'trade') {
    if (askingPrice(w, playerId, buyerId) === null)
      return { ok: false, error: `A relação com ${w.teams[p.teamId!].shortName} está péssima: eles não negociam com você. Só pagando a multa.` };
  }

  const neg: Negotiation = {
    kind,
    playerId,
    buyerId,
    sellerId: p.teamId && kind !== 'renewal' ? p.teamId : null,
    phase: kind === 'transfer' || kind === 'trade' ? 'club' : 'player',
    clubRound: 0,
    playerRound: 0,
    fee: kind === 'clause' ? p.contract!.releaseClause : 0,
    tradePlayerId,
    tradeMoney: 0,
    counterFee: null,
    counterTerms: null,
    messages: [],
  };
  if (neg.phase === 'player') {
    const st = playerStance(w, playerId, buyerId, kind);
    if (st.refuses) return { ok: true, neg: { ...neg, phase: 'failed', messages: [{ from: 'jogador', text: st.refuses }] } };
    if (kind === 'clause') neg.messages.push({ from: 'time', text: `Multa de ${fmtMoney(neg.fee)} paga. ${w.teams[p.teamId!].shortName} não pode impedir a saída; agora falta o jogador aceitar.` });
  }
  return { ok: true, neg };
}

/** Proposta ao time vendedor. Transferência: `amount` é a taxa. Troca: `amount` é o dinheiro extra que você paga. */
export function offerClub(w: World, neg: Negotiation, amount: number): Negotiation {
  if (neg.phase !== 'club') return neg;
  const asking = askingPrice(w, neg.playerId, neg.buyerId);
  const seller = w.teams[neg.sellerId!];
  const round_ = neg.clubRound + 1;
  const msgs: NegMessage[] = [...neg.messages];
  let offered: number;
  let target: number;
  if (neg.kind === 'trade') {
    const tv = tradeValueFor(w, seller.id, neg.tradePlayerId!);
    offered = tv + amount;
    target = asking ?? Infinity;
    msgs.push({ from: 'voce', text: `${w.players[neg.tradePlayerId!].nick} + ${fmtMoney(Math.max(0, amount))} por ${w.players[neg.playerId].nick}.` });
  } else {
    offered = amount;
    target = asking ?? Infinity;
    msgs.push({ from: 'voce', text: `Proposta de ${fmtMoney(amount)}.` });
  }
  if (w.teams[neg.buyerId].money < Math.max(0, amount)) {
    msgs.push({ from: 'time', text: 'Vocês nem têm esse dinheiro em caixa.' });
    return { ...neg, messages: msgs };
  }

  // Contraproposta dada é palavra: pagar o que o time pediu fecha o negócio.
  const meetsCounter = neg.counterFee !== null && amount >= neg.counterFee;
  if (offered >= target || meetsCounter) {
    msgs.push({ from: 'time', text: `${seller.shortName} aceitou. Agora falta acertar com o jogador.` });
    const st = playerStance(w, neg.playerId, neg.buyerId, neg.kind);
    const next: Negotiation = { ...neg, clubRound: round_, phase: 'player', fee: amount, tradeMoney: neg.kind === 'trade' ? amount : 0, counterFee: null, messages: msgs };
    if (neg.kind === 'trade') return { ...next, phase: 'done' }; // na troca, os contratos seguem como estão
    if (st.refuses) return { ...next, phase: 'failed', messages: [...msgs, { from: 'jogador', text: st.refuses }] };
    return next;
  }

  const lastRound = round_ >= MARKET.maxRounds;
  if (offered < target * MARKET.counterThreshold) {
    msgs.push({ from: 'time', text: lastRound ? `${seller.shortName} encerrou a conversa. A proposta ficou muito abaixo.` : 'Proposta muito baixa. Nem vamos responder com valor.' });
    return { ...neg, clubRound: round_, phase: lastRound ? 'failed' : 'club', counterFee: null, messages: msgs };
  }
  if (lastRound) {
    msgs.push({ from: 'time', text: `${seller.shortName} desistiu da negociação.` });
    return { ...neg, clubRound: round_, phase: 'failed', messages: msgs };
  }
  // Contraproposta: cede um pouco a cada rodada.
  const counter = roundTo(Math.max(offered, target * (1 - 0.04 * neg.clubRound)), 10_000);
  const counterAmount = neg.kind === 'trade' ? counter - tradeValueFor(w, seller.id, neg.tradePlayerId!) : counter;
  msgs.push({
    from: 'time',
    text: neg.kind === 'trade' ? `Aceitamos a troca se vocês colocarem mais ${fmtMoney(Math.max(0, counterAmount))}.` : `Fechamos por ${fmtMoney(counterAmount)}.`,
  });
  return { ...neg, clubRound: round_, counterFee: roundTo(Math.max(0, counterAmount), 10_000), messages: msgs };
}

/** Proposta de contrato ao jogador. */
export function offerPlayer(w: World, neg: Negotiation, terms: Terms): Negotiation {
  if (neg.phase !== 'player') return neg;
  const p = w.players[neg.playerId];
  const st = playerStance(w, neg.playerId, neg.buyerId, neg.kind);
  const value = marketValue(p, w.date);
  const round_ = neg.playerRound + 1;
  const msgs: NegMessage[] = [...neg.messages, { from: 'voce', text: `${fmtMoney(terms.salary)}/mês, ${terms.months} meses, multa de ${fmtMoney(terms.releaseClause)}.` }];

  const months = Math.max(MARKET.contractMonthsMin, Math.min(MARKET.contractMonthsMax, terms.months));
  const clause = Math.max(value * MARKET.clauseMultMin, Math.min(value * MARKET.clauseMultMax, terms.releaseClause));
  const wanted = roundTo(salaryForClause(st.desired.salary, clause, value), 500);
  const ratio = terms.salary / wanted;
  const okMonths = months >= st.minMonths;

  if (ratio >= 1 && okMonths) {
    msgs.push({ from: 'jogador', text: neg.kind === 'renewal' ? 'Fechado, renovo.' : 'Fechado! Pode anunciar.' });
    return { ...neg, playerRound: round_, phase: 'done', counterTerms: { salary: terms.salary, months, releaseClause: roundTo(clause, 50_000) }, messages: msgs };
  }
  const lastRound = round_ >= MARKET.maxRounds;
  if (lastRound) {
    msgs.push({ from: 'jogador', text: `${p.nick} não aceitou e encerrou a conversa.` });
    return { ...neg, playerRound: round_, phase: 'failed', messages: msgs };
  }
  const counter: Terms = { salary: wanted, months: Math.max(months, st.minMonths), releaseClause: roundTo(clause, 50_000) };
  msgs.push({
    from: 'jogador',
    text:
      (ratio < 0.85 ? 'Isso está longe do que eu espero. ' : '') +
      (okMonths ? '' : `Quero pelo menos ${st.minMonths} meses de contrato. `) +
      `Assino por ${fmtMoney(wanted)}/mês com essa multa.`,
  });
  return { ...neg, playerRound: round_, counterTerms: counter, messages: msgs };
}

/** Aplica o acordo fechado no mundo. */
export function finalizeNegotiation(w: World, neg: Negotiation): World {
  if (neg.phase !== 'done') return w;
  if (neg.kind === 'trade') return executeTrade(w, neg.buyerId, neg.tradePlayerId!, neg.sellerId!, neg.playerId, neg.tradeMoney);
  const t = neg.counterTerms!;
  const contract: Contract = { teamId: neg.buyerId, salary: t.salary, endDate: endOfMonthAfter(w.date, t.months), releaseClause: t.releaseClause };
  if (neg.kind === 'renewal') return executeRenewal(w, neg.playerId, contract);
  return executeTransfer(w, neg.playerId, neg.buyerId, neg.fee, contract, neg.kind === 'clause' ? 'multa' : 'transferencia');
}

/**
 * Desistir no meio da conversa. Depois de qualquer proposta feita, conta como negociação frustrada
 * (piora a relação, como tentativas repetidas de tirar jogadores). Sem proposta feita, não custa nada (null).
 */
export function abandonNegotiation(neg: Negotiation): Negotiation | null {
  if (neg.phase === 'done' || neg.phase === 'failed') return null;
  if (neg.clubRound === 0 && neg.playerRound === 0) return null;
  return { ...neg, phase: 'failed', messages: [...neg.messages, { from: 'voce', text: 'Você desistiu da negociação.' }] };
}

/** Efeitos de uma negociação que fracassou (relação com o time). */
export function failedNegotiationEffects(w: World, neg: Negotiation): World {
  if (neg.phase !== 'failed' || !neg.sellerId) return w;
  const delta = neg.clubRound > 0 && neg.playerRound === 0 && neg.kind !== 'clause' ? MARKET.relationOnFailedTalks : MARKET.relationOnPlayerRefusal;
  return { ...w, relations: changeRelation(w.relations, neg.buyerId, neg.sellerId, delta) };
}

/** Termos sugeridos para começar a conversa (o que o jogador ganha hoje, ou a referência). */
export function suggestedTerms(w: World, playerId: string): Terms {
  const p: Player = w.players[playerId];
  const value = marketValue(p, w.date);
  return {
    salary: roundTo(p.contract?.salary ?? salaryForOvr(baseOvr(p)), 500),
    months: 24,
    releaseClause: roundTo(value * 2, 50_000),
  };
}
