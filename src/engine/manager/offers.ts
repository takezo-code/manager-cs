// Propostas de outros times ao manager, pedido de orçamento, pedido de demissão e desemprego.
import { MANAGER } from '../config';
import { addDays, daysBetween } from '../date';
import type { Rng } from '../rng';
import type { Team } from '../types';
import { addMoney, type World, type WorldEvent } from '../world';
import { assignGoals, clubSize, leaveTeam, type ClubSize } from './board';
import { gainConfidence, gainReputation, managerSalary, reputationBand } from './model';

export type OfferResult = { ok: true; world: World } | { ok: false; error: string };

/** Tamanhos de clube que a reputação libera. */
function allowedSizes(rep: number): ClubSize[] {
  const band = reputationBand(rep);
  if (band === 'Desconhecido' || band === 'Promissor') return ['pequeno'];
  if (band === 'Respeitado') return ['pequeno', 'medio'];
  return ['pequeno', 'medio', 'grande'];
}

export function interestedTeams(w: World): Team[] {
  const sizes = allowedSizes(w.manager.reputation);
  // O time que você deixou há menos de um ano não te chama de volta.
  const recent = new Set(w.manager.stints.filter((s) => s.to && daysBetween(s.to, w.date) < MANAGER.rehireDays).map((s) => s.teamId));
  return Object.values(w.teams).filter((t) => t.id !== w.managerTeamId && !recent.has(t.id) && sizes.includes(clubSize(t)));
}

/** Aporte que o time oferece ao contratar o manager. */
export const offerInjection = (team: Team) => MANAGER.boardInjection[clubSize(team)];

/** Coloca a proposta do time na caixa de entrada. */
export function makeProposal(w: World, teamId: string): World {
  const item = {
    id: `mp:${teamId}:${w.date}`,
    kind: 'manager_proposta' as const,
    playerId: '',
    offerTeamId: teamId,
    askedSalary: managerSalary(w.manager.reputation),
    date: w.date,
    expires: addDays(w.date, MANAGER.offerDays),
  };
  return { ...w, inbox: [item, ...w.inbox] };
}

function maybePropose(w: World, rng: Rng, chance: number): { world: World; events: WorldEvent[] } {
  const pending = new Set(w.inbox.filter((i) => i.kind === 'manager_proposta').map((i) => i.offerTeamId));
  const teams = interestedTeams(w).filter((t) => !pending.has(t.id));
  if (!teams.length || !rng.chance(chance)) return { world: w, events: [] };
  const team = rng.pick(teams);
  return { world: makeProposal(w, team.id), events: [{ kind: 'ok', text: `${team.name} fez uma proposta para você ser o manager.` }] };
}

/** Dia 1º (empregado). */
export const monthlyManagerOffers = (w: World, rng: Rng) =>
  w.managerTeamId ? maybePropose(w, rng, MANAGER.offerChanceEmployed) : { world: w, events: [] };

/** Segundas-feiras (desempregado). */
export const weeklyUnemployedOffers = (w: World, rng: Rng) =>
  w.managerTeamId ? { world: w, events: [] } : maybePropose(w, rng, MANAGER.offerChanceUnemployed);

/** Propostas vencidas somem. */
export const expireManagerOffers = (w: World): World => ({ ...w, inbox: w.inbox.filter((i) => i.kind !== 'manager_proposta' || i.expires >= w.date) });

export function acceptOffer(world: World, itemId: string): OfferResult {
  const item = world.inbox.find((i) => i.id === itemId && i.kind === 'manager_proposta');
  if (!item?.offerTeamId) return { ok: false, error: 'Essa proposta não existe mais.' };
  const to = item.offerTeamId;
  let w = world.managerTeamId ? leaveTeam(world, 'aceitou proposta') : world;
  w = {
    ...w,
    managerTeamId: to,
    inbox: w.inbox.filter((i) => i.kind !== 'manager_proposta'),
    manager: {
      ...w.manager,
      confidence: MANAGER.startConfidence,
      salary: item.askedSalary ?? w.manager.salary,
      stints: [...w.manager.stints, { teamId: to, from: w.date, to: null, reason: null }],
    },
  };
  w = assignGoals(w, to);
  w = addMoney(w, to, offerInjection(w.teams[to]), 'diretoria', 'Aporte de chegada do manager');
  return { ok: true, world: w };
}

export const declineOffer = (w: World, itemId: string): World => ({ ...w, inbox: w.inbox.filter((i) => i.id !== itemId) });

/** Usa a proposta para pedir mais orçamento à sua diretoria. */
export function askBudget(world: World, itemId: string, rng: Rng): { world: World; event: WorldEvent } {
  const item = world.inbox.find((i) => i.id === itemId);
  const me = world.managerTeamId;
  if (!item?.offerTeamId || !me) return { world, event: { kind: 'info', text: 'Essa proposta não existe mais.' } };
  let w = declineOffer(world, itemId);
  if (rng.chance(w.manager.confidence / 100)) {
    const amount = offerInjection(w.teams[item.offerTeamId]);
    w = addMoney(w, me, amount, 'diretoria', 'Aporte para segurar o manager');
    w = { ...w, manager: gainConfidence(w.manager, MANAGER.budgetConfidence) };
    return { world: w, event: { kind: 'ok', text: 'A diretoria aceitou: aporte no caixa para você ficar.' } };
  }
  w = { ...w, manager: gainConfidence(w.manager, -MANAGER.budgetConfidence) };
  return { world: w, event: { kind: 'alerta', text: 'A diretoria não gostou da pressão e negou o aporte.' } };
}

export function resign(w: World): World {
  if (!w.managerTeamId) return w;
  const out = leaveTeam(w, 'pediu demissão');
  return { ...out, manager: gainReputation(out.manager, MANAGER.repResigned) };
}
