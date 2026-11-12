// Conversas com os jogadores: pedidos de aumento, conversa do insatisfeito, pedido de saída,
// aumento por iniciativa, redução salarial (individual ou coletiva) e negar saída.
import { MANAGER, MORALE, STAFF } from '../config';
import { lockerRoom } from '../manager/effects';
import { staffAttr } from '../staff/model';
import { addDays, daysBetween } from '../date';
import { effectiveAttributes } from '../player';
import type { Rng } from '../rng';
import type { Player } from '../types';
import type { InboxItem, World, WorldEvent } from '../world';
import { applyJealousy, applySatisfaction, bandOf, fairSalary, recentRaise } from './satisfaction';
import { fmtMoney, roundTo } from '../format';


function setMood(w: World, id: string, mood: Partial<Player['mood']>): World {
  const p = w.players[id];
  return { ...w, players: { ...w.players, [id]: { ...p, mood: { ...p.mood, ...mood } } } };
}

function setSalary(w: World, id: string, salary: number): World {
  const p = w.players[id];
  return { ...w, players: { ...w.players, [id]: { ...p, contract: p.contract ? { ...p.contract, salary } : null } } };
}

// ---------- Geração (uma vez por mês, só para o seu time) ----------

export function monthlyRequests(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const team = w.teams[w.managerTeamId];
  for (const id of team.playerIds) {
    const p = w.players[id];
    if (!p.contract || w.inbox.some((i) => i.playerId === id)) continue;
    const cooled = !p.mood.lastRequest || daysBetween(p.mood.lastRequest, w.date) >= MORALE.requestCooldownDays;
    if (!cooled) continue;
    const band = bandOf(p.satisfaction);
    const base: Omit<InboxItem, 'kind'> = { id: `${w.date}-${id}`, playerId: id, date: w.date, expires: addDays(w.date, MORALE.inboxDays) };
    let item: InboxItem | null = null;
    if (band === 'quer_sair' && !p.mood.exitDenied) {
      item = { ...base, kind: 'saida' };
      events.push({ kind: 'alerta', text: `${p.nick} quer sair e pediu para ser negociado.` });
    } else if (band === 'insatisfeito') {
      item = { ...base, kind: 'conversa' };
      events.push({ kind: 'alerta', text: `${p.nick} está insatisfeito e pediu uma conversa.` });
    } else if (p.contract.salary < fairSalary(p) * MORALE.raiseRequestBelow || p.mood.salaryBeforeCut) {
      const asked = p.mood.salaryBeforeCut ?? roundTo(fairSalary(p), 500);
      item = { ...base, kind: 'aumento', askedSalary: Math.max(asked, p.contract.salary + 500) };
      events.push({ kind: 'info', text: `${p.nick} pediu aumento para ${fmtMoney(item.askedSalary!)}/mês.` });
    } else if (band === 'incomodado' && p.satisfaction < MORALE.bands.satisfeito - 5) {
      events.push({ kind: 'info', text: `Rumor: ${p.nick} anda incomodado no time.` });
      w = setMood(w, id, { lastRequest: w.date });
    }
    if (item) {
      w = { ...setMood(w, id, { lastRequest: w.date }), inbox: [...w.inbox, item] };
    }
  }
  return { world: w, events };
}

/** Pedidos vencidos sem resposta contam como recusa/ignorar. */
export function expireInbox(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  for (const item of w.inbox.filter((i) => i.expires < w.date && i.kind !== 'convite' && !i.staffId)) {
    const r = respondInbox(w, item.id, item.kind === 'saida' ? { kind: 'negar' } : item.kind === 'aumento' ? { kind: 'recusar' } : { kind: 'ignorar' });
    w = r.world;
    events.push({ kind: 'info', text: `Sem resposta: ${r.event.text}` });
  }
  return { world: w, events };
}

// ---------- Respostas ----------

export type InboxResponse =
  | { kind: 'aceitar' }
  | { kind: 'contrapropor'; salary: number }
  | { kind: 'recusar' }
  | { kind: 'prometer' }
  | { kind: 'aumentar'; pct: number }
  | { kind: 'ignorar' }
  | { kind: 'liberar' }
  | { kind: 'negar' };

export function respondInbox(world: World, itemId: string, r: InboxResponse): { world: World; event: WorldEvent } {
  const item = world.inbox.find((i) => i.id === itemId);
  if (!item) return { world, event: { kind: 'alerta', text: 'Essa conversa não existe mais.' } };
  let w: World = { ...world, inbox: world.inbox.filter((i) => i.id !== itemId) };
  const p = w.players[item.playerId];
  if (!p.contract || p.teamId !== w.managerTeamId) return { world: w, event: { kind: 'info', text: `${p.nick} não está mais no time.` } };
  const E = MORALE.events;

  if (item.kind === 'aumento') {
    const asked = item.askedSalary!;
    if (r.kind === 'aceitar') {
      w = setSalary(w, p.id, asked);
      w = setMood(w, p.id, { lastRaise: w.date, raiseRefusals: 0, salaryBeforeCut: null });
      w = applySatisfaction(w, p.id, E.raiseRequested);
      w = applyJealousy(w, w.managerTeamId, p.id).world;
      return { world: w, event: { kind: 'ok', text: `${p.nick} recebeu o aumento para ${fmtMoney(asked)}/mês.` } };
    }
    if (r.kind === 'contrapropor') {
      const mid = p.contract.salary + (asked - p.contract.salary) * 0.6;
      if (r.salary >= mid) {
        w = setSalary(w, p.id, r.salary);
        w = setMood(w, p.id, { lastRaise: w.date, raiseRefusals: 0, salaryBeforeCut: r.salary >= (p.mood.salaryBeforeCut ?? 0) ? null : p.mood.salaryBeforeCut });
        w = applySatisfaction(w, p.id, E.raiseRequested / 2);
        w = applyJealousy(w, w.managerTeamId, p.id).world;
        return { world: w, event: { kind: 'ok', text: `${p.nick} aceitou ${fmtMoney(r.salary)}/mês.` } };
      }
      // Contraproposta baixa conta como recusa.
    }
    const refusals = p.mood.raiseRefusals + 1;
    w = setMood(w, p.id, { raiseRefusals: refusals });
    w = applySatisfaction(w, p.id, refusals >= 2 ? E.secondRefusal : E.raiseRefused);
    return {
      world: w,
      event: {
        kind: 'alerta',
        text: refusals >= 2 ? `Segunda recusa: ${p.nick} ficou irritado e já se fala em saída.` : `Aumento recusado. ${p.nick} não gostou.`,
      },
    };
  }

  if (item.kind === 'conversa') {
    if (r.kind === 'prometer') {
      w = setMood(w, p.id, { promiseUntil: addDays(w.date, MORALE.promiseDays) });
      w = applySatisfaction(w, p.id, E.promise);
      return { world: w, event: { kind: 'ok', text: `Você prometeu titularidade a ${p.nick}. Se ele seguir no banco, a promessa quebra.` } };
    }
    if (r.kind === 'aumentar') {
      const out = giveRaise(w, p.id, r.pct);
      return { world: out.world, event: out.event };
    }
    w = applySatisfaction(w, p.id, E.ignored);
    return { world: w, event: { kind: 'info', text: `Você ignorou a conversa com ${p.nick}.` } };
  }

  // Pedido de saída.
  if (r.kind === 'liberar') {
    w = { ...w, players: { ...w.players, [p.id]: { ...w.players[p.id], transferListed: true } } };
    w = applySatisfaction(w, p.id, E.released);
    return { world: w, event: { kind: 'info', text: `${p.nick} foi colocado à venda.` } };
  }
  return denyExit(w, p.id);
}

/** Negar a saída: fica até o fim do contrato (salvo multa paga), com várias consequências. */
export function denyExit(world: World, playerId: string): { world: World; event: WorldEvent } {
  let w = setMood(world, playerId, { exitDenied: true });
  const p = w.players[playerId];
  w = applySatisfaction(w, playerId, MORALE.events.exitDenied);
  for (const id of w.teams[p.teamId!].playerIds) if (id !== playerId) w = applySatisfaction(w, id, MORALE.events.teammateDenied);
  return {
    world: w,
    event: {
      kind: 'alerta',
      text: `Saída negada: ${p.nick} fica até o fim do contrato, mas vai render menos, não renova e o vestiário sentiu o clima.`,
    },
  };
}

// ---------- Ações do manager ----------

/** Aumento por iniciativa: vale mais que atender um pedido, mas perde força se repetido logo. */
export function giveRaise(world: World, playerId: string, pct: number): { world: World; event: WorldEvent } {
  const p = world.players[playerId];
  if (!p.contract) return { world, event: { kind: 'alerta', text: 'Jogador sem contrato.' } };
  const salary = roundTo(p.contract.salary * (1 + pct / 100), 500);
  let bonus = MORALE.events.raiseInitiativePer10 * (pct / 10);
  if (recentRaise(p, world.date)) bonus /= 2;
  let w = setSalary(world, playerId, salary);
  w = setMood(w, playerId, { lastRaise: w.date, salaryBeforeCut: p.mood.salaryBeforeCut && salary >= p.mood.salaryBeforeCut ? null : p.mood.salaryBeforeCut });
  w = applySatisfaction(w, playerId, bonus);
  const j = applyJealousy(w, p.teamId!, playerId);
  w = j.world;
  const extra = j.jealous.length ? ` Ciúme no elenco: ${j.jealous.map((id) => w.players[id].nick).join(', ')}.` : '';
  return { world: w, event: { kind: 'ok', text: `${p.nick} ganhou ${pct}% de aumento (${fmtMoney(salary)}/mês).${extra}` } };
}

/**
 * Proposta de redução salarial (nunca imposição). Retorna quem aceitou e quem recusou.
 * Aceita mais fácil: crise real, redução coletiva, má fase, salário acima do mercado, IGL com Liderança alta.
 * Recusa mais: boa fase, ser o único cortado, corte grande.
 */
export function proposeCut(world: World, playerIds: string[], pct: number, rng: Rng): { world: World; accepted: string[]; refused: string[]; blocked: string[] } {
  let w = world;
  const team = w.teams[w.managerTeamId];
  const collective = playerIds.length > 1;
  const crisis = team.money < 0 || team.lateMonths > 0;
  const igl = team.starters.map((id) => w.players[id]).find((x) => x.role === 'IGL');
  const accepted: string[] = [];
  const refused: string[] = [];
  const blocked: string[] = [];
  for (const id of playerIds) {
    const p = w.players[id];
    if (!p.contract) continue;
    if (p.mood.lastCut && daysBetween(p.mood.lastCut, w.date) < MORALE.cutCooldownDays) {
      blocked.push(id);
      continue;
    }
    let chance = 0.3;
    if (crisis) chance += 0.35;
    if (collective) chance += 0.15;
    else chance -= 0.15;
    if (p.phase === 'ma_fase' || p.phase === 'abaixo') chance += 0.15;
    if (p.phase === 'destaque' || p.phase === 'em_alta' || p.phase === 'boa_fase') chance -= 0.2;
    if (p.contract.salary > fairSalary(p) * 1.1) chance += 0.2;
    if (pct > 30) chance -= 0.35;
    else if (pct > 20) chance -= 0.2;
    // IGL com Liderança (Equipe) alta ajuda a convencer o elenco.
    if (collective && igl) chance += (effectiveAttributes(igl).EQP - 70) * 0.01;
    chance += (staffAttr(w, team.id, 'GES') - 70) * STAFF.managementCut + MANAGER.lockerCut * lockerRoom(w);
    if (rng.chance(Math.max(0.02, Math.min(0.95, chance)))) {
      const salary = roundTo(p.contract.salary * (1 - pct / 100), 500);
      w = setMood(w, id, { lastCut: w.date, salaryBeforeCut: p.mood.salaryBeforeCut ?? p.contract.salary, cutRefusals: 0 });
      w = setSalary(w, id, salary);
      w = applySatisfaction(w, id, MORALE.events.cutAccepted);
      accepted.push(id);
    } else {
      const refusals = p.mood.cutRefusals + 1;
      w = setMood(w, id, { lastCut: w.date, cutRefusals: refusals });
      // Insistir pode gerar pedido de saída.
      w = applySatisfaction(w, id, refusals >= 2 ? -40 : MORALE.events.cutRefused);
      refused.push(id);
    }
  }
  return { world: w, accepted, refused, blocked };
}
