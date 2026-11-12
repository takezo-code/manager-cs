// IA do mercado: um passo por dia. Renova e encerra contratos, completa elencos, busca reforços,
// faz propostas pelos jogadores do seu time e às vezes paga multas.
import { teamBusy, windowOpen } from '../calendar';
import { saleBonus } from '../manager/effects';
import { promote } from '../academy';
import { ACADEMY, AI_MARKET, FINANCE, MARKET } from '../config';
import { payroll } from '../finance/monthly';
import { bandOf } from '../morale/satisfaction';
import { addDays, daysBetween, endOfMonthAfter } from '../date';
import { baseOvr } from '../form';
import { playerOvr } from '../player';
import type { Rng } from '../rng';
import { starterOvrAt, weakestRole } from '../squad';
import type { Contract, Player, Team } from '../types';
import type { IncomingOffer, World, WorldEvent } from '../world';
import { askingPrice, playerStance } from './negotiation';
import { executeRenewal, executeTransfer, releasePlayer } from './transfer';
import { contractMonthsLeft, marketValue } from './value';
import { fmtMoney, roundTo } from '../format';


function aiContract(w: World, p: Player, teamId: string, rng: Rng): Contract {
  const st = playerStance(w, p.id, teamId, p.teamId === teamId ? 'renewal' : 'transfer');
  return { teamId, salary: st.desired.salary, endDate: endOfMonthAfter(w.date, rng.int(12, 36)), releaseClause: st.desired.releaseClause };
}

/** Abre vaga no elenco da IA dispensando o reserva mais fraco. */
function makeRoom(w: World, teamId: string): World {
  const t = w.teams[teamId];
  if (t.playerIds.length < MARKET.squadMax) return w;
  const bench = t.playerIds.filter((id) => !t.starters.includes(id)).sort((a, b) => playerOvr(w.players[a]) - playerOvr(w.players[b]));
  return bench.length ? releasePlayer(w, bench[0], 'dispensa') : w;
}

const wantsOut = (p: Player) => bandOf(p.satisfaction) === 'quer_sair' || p.mood.exitDenied;

const freeAgents = (w: World) => Object.values(w.players).filter((p) => !p.teamId);

/** Chegou ao time há pouco tempo: a IA não revende nem tira de lá. */
export function recentlyMoved(w: World, playerId: string): boolean {
  const last = w.transferLog.find((e) => e.playerId === playerId && e.kind !== 'renovacao');
  return !!last && daysBetween(last.date, w.date) < AI_MARKET.moveCooldownDays;
}

export function aiMarketDay(world: World, myTeamId: string, rng: Rng): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const myTeam = () => w.teams[myTeamId];
  const aiTeams = () => Object.values(w.teams).filter((t) => t.id !== myTeamId);
  const reserve = (t: Team) => Math.max(300_000, payroll(w, t) * FINANCE.aiReserveMonths);

  // 0) A IA põe à venda quem quer sair e, em crise, o reserva mais caro.
  for (const t of aiTeams()) {
    for (const id of t.playerIds) {
      const p = w.players[id];
      const list = wantsOut(p) || (t.lateMonths > 0 && !t.starters.includes(id));
      if (list !== p.transferListed) w = { ...w, players: { ...w.players, [id]: { ...p, transferListed: list } } };
    }
  }

  // 1) Contratos: a IA renova quem está acabando; quem passou da data vira agente livre.
  for (const p of Object.values(w.players)) {
    if (!p.contract || !p.teamId) continue;
    // Academy: o contrato se renova sozinho, com o mesmo salário, até ele subir ou fazer 20.
    if (p.squad === 'academy') {
      if (p.contract.endDate < w.date)
        w = { ...w, players: { ...w.players, [p.id]: { ...p, contract: { ...p.contract, endDate: endOfMonthAfter(w.date, ACADEMY.contractMonths) } } } };
      continue;
    }
    const left = contractMonthsLeft(p, w.date);
    if (p.teamId !== myTeamId && left <= AI_MARKET.renewMonths && left > 0 && rng.chance(0.03)) {
      w = executeRenewal(w, p.id, aiContract(w, p, p.teamId, rng));
    } else if (p.contract.endDate < w.date) {
      const team = w.teams[p.teamId];
      w = releasePlayer(w, p.id, 'fim_contrato');
      if (team.id === myTeamId) events.push({ kind: 'alerta', text: `O contrato de ${p.nick} acabou e ele saiu de graça.` });
    }
  }

  // 2) Elencos da IA com menos de 5: promovem da academy ou contratam o melhor agente livre da função que falta.
  for (const t of aiTeams()) {
    while (w.teams[t.id].playerIds.length < MARKET.squadMin && (w.teams[t.id].academyIds ?? []).length) {
      const best = [...w.teams[t.id].academyIds].sort((a, b) => playerOvr(w.players[b]) - playerOvr(w.players[a]))[0];
      const r = promote(w, best);
      if (!r.ok) break;
      w = r.world;
    }
    while (w.teams[t.id].playerIds.length < MARKET.squadMin) {
      const team = w.teams[t.id];
      const roles = new Set(team.playerIds.map((id) => w.players[id].role));
      const pool = freeAgents(w).sort((a, b) => Number(roles.has(a.role)) - Number(roles.has(b.role)) || playerOvr(b) - playerOvr(a));
      const pick = pool[0];
      if (!pick) break;
      w = executeTransfer(w, pick.id, t.id, 0, aiContract(w, pick, t.id, rng), 'livre');
    }
  }

  // Fora da janela de transferências, só agentes livres (passo 2) e contratos (passo 1).
  const open = windowOpen(w.date);
  const busy = (teamId: string | null) => !!teamId && teamBusy(w.calendar ?? [], teamId);

  // 3) Reforços entre times da IA (só com folga no caixa, sem salário atrasado e sem evento em andamento).
  for (const t of open ? aiTeams() : []) {
    if (!rng.chance(AI_MARKET.upgradeChance) || t.lateMonths > 0 || busy(t.id)) continue;
    const team = w.teams[t.id];
    const weak = weakestRole(team, w.players);
    const candidates = Object.values(w.players)
      .filter(
        (p) =>
          p.role === weak.role &&
          p.teamId !== t.id &&
          p.teamId !== myTeamId &&
          p.squad !== 'academy' &&
          playerOvr(p) >= weak.ovr + AI_MARKET.minUpgrade &&
          !recentlyMoved(w, p.id) &&
          !busy(p.teamId),
      )
      .map((p) => ({ p, price: p.teamId ? askingPrice(w, p.id, t.id) : 0 }))
      .filter((c): c is { p: Player; price: number } => c.price !== null && team.money - c.price >= reserve(team))
      .filter((c) => !playerStance(w, c.p.id, t.id, c.p.teamId ? 'transfer' : 'free').refuses)
      .sort((a, b) => a.price - b.price);
    const pick = candidates[0];
    if (!pick) continue;
    w = makeRoom(w, t.id);
    w = executeTransfer(w, pick.p.id, t.id, pick.price, aiContract(w, pick.p, t.id, rng), pick.p.teamId ? 'transferencia' : 'livre');
  }

  // 4) Propostas pelos seus jogadores (expiram em alguns dias).
  w = { ...w, offers: w.offers.filter((o) => o.expires >= w.date && w.players[o.playerId].teamId === myTeamId) };
  const mine = myTeam().playerIds.map((id) => w.players[id]);
  const anyListed = mine.some((p) => p.transferListed);
  if (open && w.offers.length < 3 && mine.length && rng.chance(AI_MARKET.offerChance * (anyListed ? 4 : 1))) {
    const target = rng.weighted(mine, (p) => (recentlyMoved(w, p.id) ? 0 : 1) * (p.transferListed ? 6 : 1) * (wantsOut(p) ? 3 : 1) * (1 + Math.max(0, baseOvr(p) - 75) / 5));
    const value = marketValue(target, w.date);
    const buyers = aiTeams().filter(
      (t) =>
        t.money >= value * 1.1 &&
        playerOvr(target) > starterOvrAt(t, w.players, target.role) &&
        !playerStance(w, target.id, t.id, 'transfer').refuses &&
        !w.offers.some((o) => o.fromTeamId === t.id && o.playerId === target.id),
    );
    if (buyers.length) {
      const buyer = rng.pick(buyers);
      const fee = roundTo(value * (target.transferListed ? 0.85 + rng.next() * 0.2 : 0.95 + rng.next() * 0.25) * (1 + saleBonus(w)), 10_000);
      const offer: IncomingOffer = {
        id: `${w.date}-${buyer.id}-${target.id}`,
        fromTeamId: buyer.id,
        playerId: target.id,
        fee,
        date: w.date,
        expires: addDays(w.date, AI_MARKET.offerDays),
      };
      w = { ...w, offers: [...w.offers, offer] };
      events.push({ kind: 'info', text: `${buyer.shortName} fez uma proposta de ${fmtMoney(fee)} por ${target.nick}.` });
    }
  }

  // 5) Multa paga por um jogador seu (raro): o time não pode impedir; o jogador decide.
  if (open && rng.chance(AI_MARKET.clauseChance) && mine.length > MARKET.squadMin - 1) {
    const target = rng.pick(mine);
    const clause = target.contract?.releaseClause ?? Infinity;
    const buyer = aiTeams().find((t) => t.money >= clause * 1.3 && playerOvr(target) >= starterOvrAt(t, w.players, target.role) + 5);
    if (buyer) {
      const st = playerStance(w, target.id, buyer.id, 'clause');
      const leaves = !st.refuses && (target.satisfaction < 70 || buyer.hltvRank < myTeam().hltvRank);
      if (leaves) {
        w = makeRoom(w, buyer.id);
        w = executeTransfer(w, target.id, buyer.id, clause, aiContract(w, target, buyer.id, rng), 'multa');
        events.push({ kind: 'alerta', text: `${buyer.shortName} pagou a multa de ${fmtMoney(clause)} e levou ${target.nick}.` });
      } else {
        events.push({ kind: 'info', text: `${buyer.shortName} pagou a multa de ${target.nick}, mas ele recusou a saída.` });
      }
    }
  }

  return { world: w, events };
}

/** Resposta a uma proposta recebida. Contraproposta: a IA aceita até 30% acima do valor de mercado. */
export function respondToOffer(
  w: World,
  offerId: string,
  response: { kind: 'accept' } | { kind: 'refuse' } | { kind: 'counter'; fee: number },
  rng: Rng,
): { world: World; event: WorldEvent } {
  const offer = w.offers.find((o) => o.id === offerId);
  if (!offer) return { world: w, event: { kind: 'alerta', text: 'Essa proposta não existe mais.' } };
  const rest = { ...w, offers: w.offers.filter((o) => o.id !== offerId) };
  const p = w.players[offer.playerId];
  const buyer: Team = w.teams[offer.fromTeamId];
  if (response.kind === 'refuse') return { world: rest, event: { kind: 'info', text: `Proposta de ${buyer.shortName} por ${p.nick} recusada.` } };
  if (!windowOpen(w.date)) return { world: w, event: { kind: 'alerta', text: 'Mercado fechado: a venda só pode ser fechada na janela de transferências.' } };

  let fee = offer.fee;
  if (response.kind === 'counter') {
    const max = roundTo(marketValue(p, w.date) * 1.3, 10_000);
    if (response.fee > max || response.fee > buyer.money)
      return { world: rest, event: { kind: 'info', text: `${buyer.shortName} não aceitou pagar ${fmtMoney(response.fee)} e desistiu de ${p.nick}.` } };
    fee = response.fee;
  }
  // A proposta pode ter dias: o comprador precisa ainda ter o dinheiro.
  if (buyer.money < fee) return { world: rest, event: { kind: 'info', text: `${buyer.shortName} ficou sem caixa e desistiu de ${p.nick}.` } };
  const st = playerStance(w, p.id, buyer.id, 'transfer');
  if (st.refuses) return { world: rest, event: { kind: 'info', text: `${buyer.shortName} aceitou, mas ${st.refuses}` } };
  let next = makeRoom(rest, buyer.id);
  next = executeTransfer(next, p.id, buyer.id, fee, aiContract(next, p, buyer.id, rng), 'transferencia');
  return { world: next, event: { kind: 'ok', text: `${p.nick} vendido para ${buyer.shortName} por ${fmtMoney(fee)}.` } };
}
