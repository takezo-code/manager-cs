// Satisfação (0 a 100): faixas, efeitos mensais, eventos e ciúme no elenco.
import { MANAGER, MEDIA, MORALE, STAFF } from '../config';
import { lowMood } from '../media/fans';
import { lockerRoom } from '../manager/effects';
import { staffAttr } from '../staff/model';
import { daysBetween } from '../date';
import { baseOvr } from '../form';
import { salaryForOvr } from '../market/value';
import type { Player, PlayerMood } from '../types';
import type { World } from '../world';

export type Band = 'satisfeito' | 'incomodado' | 'insatisfeito' | 'quer_sair';

export const BAND_LABEL: Record<Band, string> = {
  satisfeito: 'Satisfeito',
  incomodado: 'Incomodado',
  insatisfeito: 'Insatisfeito',
  quer_sair: 'Querendo sair',
};

export function bandOf(satisfaction: number): Band {
  const b = MORALE.bands;
  if (satisfaction >= b.satisfeito) return 'satisfeito';
  if (satisfaction >= b.incomodado) return 'incomodado';
  if (satisfaction >= b.insatisfeito) return 'insatisfeito';
  return 'quer_sair';
}

export const DEFAULT_MOOD: PlayerMood = {
  promiseUntil: null,
  exitDenied: false,
  lastRaise: null,
  raiseRefusals: 0,
  lastCut: null,
  cutRefusals: 0,
  salaryBeforeCut: null,
  lastRequest: null,
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Aplica uma mudança de satisfação. Com a saída negada, eventos bons valem metade e há um teto
 * (é difícil reconquistar); se mesmo assim passar do teto, o jogador foi reconquistado.
 */
export function applySatisfaction(w: World, playerId: string, delta: number): World {
  return { ...w, players: { ...w.players, [playerId]: withSatisfaction(w.players[playerId], delta) } };
}

/** Mesmo efeito de `applySatisfaction`, direto no jogador (para laços que mexem em muitos de uma vez). */
export function withSatisfaction(p: Player, delta: number): Player {
  let d = delta;
  if (p.mood.exitDenied && d > 0) d *= MORALE.deniedEventFactor;
  let s = clamp(p.satisfaction + d);
  let mood = p.mood;
  if (mood.exitDenied && s > MORALE.deniedCap) {
    // Reconquistado só com bônus grandes (título, aumento alto); senão fica no teto.
    if (delta >= MORALE.events.title) mood = { ...mood, exitDenied: false };
    else s = MORALE.deniedCap;
  }
  return { ...p, satisfaction: s, mood };
}

/** Referência de salário de mercado para o jogador hoje. */
export const fairSalary = (p: Player) => salaryForOvr(baseOvr(p));

/** Efeitos do mês para todos os jogadores com time. */
export function monthlySatisfaction(world: World): World {
  const w = world;
  const players = { ...w.players };
  const m = MORALE.monthly;
  for (const p of Object.values(w.players)) {
    if (!p.teamId || !p.contract) continue;
    const team = w.teams[p.teamId];
    let delta = 0;
    const starter = team.starters.includes(p.id);
    const promised = p.mood.promiseUntil && p.mood.promiseUntil >= w.date;
    if (!starter) delta += promised ? m.brokenPromise : m.bench;
    const ratio = p.contract.salary / fairSalary(p);
    if (ratio < 0.6) delta += m.veryLowSalary;
    else if (ratio < MORALE.raiseRequestBelow) delta += m.lowSalary;
    else if (ratio > 1.1) delta += m.highSalary;
    if (p.phase === 'destaque' || p.phase === 'em_alta') delta += m.goodPhase;
    if (p.phase === 'ma_fase') delta += m.badPhase;
    // Esperando a volta do salário cortado, com o time já saudável.
    if (p.mood.salaryBeforeCut && team.lateMonths === 0 && team.money > 0) delta += m.waitingRestore;
    // Sem nada pesando, volta devagar para o neutro.
    if (delta === 0 && p.satisfaction < m.driftTo) delta = Math.min(m.drift, m.driftTo - p.satisfaction);
    // Torcida na bronca pesa em quem não tem Sangue Frio.
    if (lowMood(w, team.id) && p.skillId !== 'sangue_frio') delta -= MEDIA.lowMoodMonthly;
    // Psicólogo (Motivação) segura as perdas; técnico (Gestão) ajuda todo mês.
    if (delta < 0) delta *= 1 - (staffAttr(w, team.id, 'MOT') - STAFF.minAttr) / 110;
    delta += (staffAttr(w, team.id, 'GES') - 70) * STAFF.managementMonthly;
    // Gestão de vestiário do manager.
    if (team.id === w.managerTeamId) delta += MANAGER.lockerMonthly * lockerRoom(w);
    let q = withSatisfaction(p, delta);
    // Promessa quebrada é cobrada uma vez só.
    if (promised && !starter) q = { ...q, mood: { ...q.mood, promiseUntil: null } };
    players[p.id] = q;
  }
  return { ...w, players };
}

/**
 * Ciúme: depois de um aumento ou de uma contratação com salário alto, colegas de OVR parecido
 * que ganham bem menos perdem satisfação. Não vale para a redução coletiva.
 */
export function applyJealousy(w: World, teamId: string, targetId: string): { world: World; jealous: string[] } {
  const target = w.players[targetId];
  if (!target.contract) return { world: w, jealous: [] };
  let next = w;
  const jealous: string[] = [];
  for (const id of w.teams[teamId].playerIds) {
    if (id === targetId) continue;
    const p = w.players[id];
    if (!p.contract) continue;
    const similar = Math.abs(baseOvr(p) - baseOvr(target)) <= 3;
    if (similar && p.contract.salary < target.contract.salary * 0.7) {
      next = applySatisfaction(next, id, MORALE.events.jealousy * (teamId === w.managerTeamId ? 1 - MANAGER.lockerJealousy * lockerRoom(w) : 1));
      jealous.push(id);
    }
  }
  return { world: next, jealous };
}

/** Aumento recente (vale metade de bônus se repetido logo). */
export const recentRaise = (p: Player, date: string) => !!p.mood.lastRaise && daysBetween(p.mood.lastRaise, date) < MORALE.raiseCooldownDays;
