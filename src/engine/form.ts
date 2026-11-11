// Fases (pelo rating recente comparado ao esperado para o OVR) e cansaço.
import { ENERGY, FORM, MORALE } from './config';
import { playerOvr } from './player';
import type { Phase, Player } from './types';

/** OVR sem o efeito da fase atual, para a fase não se alimentar dela mesma. */
export const baseOvr = (p: Player) => playerOvr({ ...p, phase: 'normal', phaseStreak: 0 });

export const expectedRating = (ovr: number) => FORM.expectedBase + (ovr - 80) * FORM.expectedPerOvr;

export function recentAverage(p: Player): number | null {
  if (p.recentRatings.length < FORM.minMaps) return null;
  return p.recentRatings.reduce((a, b) => a + b, 0) / p.recentRatings.length;
}

export function phaseFor(p: Player): Phase {
  const avg = recentAverage(p);
  if (avg === null) return 'normal';
  let diff = avg - expectedRating(baseOvr(p));
  if (p.energy < FORM.lowEnergy) diff -= (FORM.lowEnergy - p.energy) * FORM.lowEnergyPenalty;
  // Segurado contra a vontade: rende menos (mais chance de fase ruim).
  if (p.mood?.exitDenied) diff -= MORALE.deniedFormPenalty;
  const t = FORM.thresholds;
  if (diff >= t.destaque) return 'destaque';
  if (diff >= t.em_alta) return 'em_alta';
  if (diff >= t.boa_fase) return 'boa_fase';
  if (diff > t.abaixo) return 'normal';
  if (diff > t.ma_fase) return 'abaixo';
  return 'ma_fase';
}

/** Depois de uma série: registra os ratings por mapa, gasta energia e recalcula a fase. */
export function afterSeries(p: Player, mapRatings: number[]): Player {
  const recentRatings = [...p.recentRatings, ...mapRatings].slice(-FORM.windowMaps);
  const energy = Math.max(0, p.energy - mapRatings.length * ENERGY.perMap);
  const next = { ...p, recentRatings, energy };
  const phase = phaseFor(next);
  return { ...next, phase, phaseStreak: phase === p.phase ? p.phaseStreak + 1 : 1 };
}

export const recoverDay = (p: Player): Player => ({ ...p, energy: Math.min(100, p.energy + ENERGY.perDay) });

/** Dia de descanso, fora de campeonato. */
export const recoverRest = (p: Player): Player => (p.energy >= 100 ? p : { ...p, energy: Math.min(100, p.energy + ENERGY.restPerDay) });

export const recoverBetweenEvents = (p: Player): Player => ({ ...p, energy: Math.min(100, p.energy + ENERGY.betweenEvents) });
