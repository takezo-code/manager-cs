// Rating por partida no estilo HLTV 2.0 (aproximação pública da fórmula).
import type { PlayerMatchStats } from './types';

export function calcRating(s: PlayerMatchStats): number {
  if (s.rounds === 0) return 0;
  const kpr = s.kills / s.rounds;
  const dpr = s.deaths / s.rounds;
  const apr = s.assists / s.rounds;
  const adr = s.damage / s.rounds;
  const kast = (s.kastRounds / s.rounds) * 100;
  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
  const rating = 0.0073 * kast + 0.3591 * kpr - 0.5329 * dpr + 0.2372 * impact + 0.0032 * adr + 0.1587;
  return Math.round(rating * 100) / 100;
}

export function adr(s: PlayerMatchStats): number {
  return s.rounds ? Math.round(s.damage / s.rounds) : 0;
}
