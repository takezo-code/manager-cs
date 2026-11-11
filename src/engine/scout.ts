// Olheiro: estima o POT dos jovens. Nível baixo dá faixa vaga (às vezes errada); alto, quase exata.
import { SCOUT } from './config';
import { baseOvr } from './form';
import { hashString } from './rng';
import type { Player } from './types';
import { addMoney, type World } from './world';

const frac = (key: string) => (hashString(key) % 10_000) / 10_000;

export interface PotentialEstimate {
  min: number;
  max: number;
  alerts: string[];
}

/** Estimativa estável (depende só do jogador e do nível). */
export function estimatePotential(p: Player, level: number): PotentialEstimate {
  const cfg = SCOUT.levels[Math.max(1, Math.min(5, level)) - 1];
  let center = p.potential;
  if (frac(`${p.id}:${level}:erro`) < cfg.wrongChance) {
    // Erro: o centro escapa para fora da faixa real.
    const sign = frac(`${p.id}:${level}:lado`) < 0.5 ? -1 : 1;
    center += sign * (cfg.range + 1 + Math.floor(frac(`${p.id}:${level}:tam`) * 4));
  }
  const min = Math.max(40, center - cfg.range);
  const max = Math.min(99, min + 2 * cfg.range);
  const alerts: string[] = [];
  if (level >= SCOUT.alertsFrom) {
    if (p.potential >= SCOUT.starPotential) alerts.push('Pode ser a nova revelação');
    if (p.potential - baseOvr(p) >= SCOUT.bigGap) alerts.push('Grande potencial de melhora');
  }
  return { min, max, alerts };
}

export function upgradeScout(w: World): { ok: true; world: World } | { ok: false; error: string } {
  const t = w.teams[w.managerTeamId];
  const level = t.scoutLevel ?? 1;
  if (level >= 5) return { ok: false, error: 'O olheiro já está no nível máximo.' };
  const price = SCOUT.upgradePrices[level - 1];
  if (t.money < price) return { ok: false, error: 'Dinheiro insuficiente para melhorar o olheiro.' };
  const next = { ...w, teams: { ...w.teams, [t.id]: { ...t, scoutLevel: level + 1 } } };
  return { ok: true, world: addMoney(next, t.id, -price, 'olheiro', `Olheiro nível ${level + 1}`) };
}
