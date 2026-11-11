// Valor de mercado, salário de referência e região dos jogadores.
import { MARKET } from '../config';
import { monthsUntil } from '../date';
import { baseOvr } from '../form';
import type { Player, Region } from '../types';

const round = (v: number, step: number) => Math.round(v / step) * step;

export const salaryForOvr = (ovr: number) => round(MARKET.salaryBase * Math.pow(MARKET.salaryGrowth, ovr - 60), 500);

export function contractMonthsLeft(p: Player, date: string): number {
  return p.contract ? Math.max(0, monthsUntil(date, p.contract.endDate)) : 0;
}

/**
 * Valor de mercado: OVR, idade, potencial, nível da carta, fase, satisfação e contrato restante.
 * Jogador em má fase com contrato acabando fica barato; jovem em Destaque fica caro.
 */
export function marketValue(p: Player, date: string): number {
  const ovr = baseOvr(p);
  let v = MARKET.valueBase * Math.pow(MARKET.valueGrowth, ovr - 60);
  v *= MARKET.ageFactor.find((a) => p.age <= a.maxAge)!.f;
  v *= 1 + Math.max(0, p.potential - ovr) * MARKET.potentialFactor;
  v *= 1 + p.evolution * MARKET.evolutionFactor;
  v *= MARKET.phaseFactor[p.phase];
  v *= p.satisfaction < 30 ? 0.8 : p.satisfaction < 50 ? 0.9 : 1;
  if (p.contract) {
    const months = contractMonthsLeft(p, date);
    // Raiz: o valor só despenca nos últimos meses (mais real que uma reta).
    const t = Math.sqrt(Math.min(1, months / MARKET.contractFullMonths));
    v *= MARKET.contractFactorMin + (1 - MARKET.contractFactorMin) * t;
  }
  return Math.max(10_000, round(v, 10_000));
}

const REGION_BY_COUNTRY: Record<string, Region> = {
  BR: 'SA', AR: 'SA', UY: 'SA', CL: 'SA', PE: 'SA', CO: 'SA',
  US: 'NA', CA: 'NA', GT: 'NA', MX: 'NA',
  RU: 'CIS', UA: 'CIS', BY: 'CIS', KZ: 'CIS',
  MN: 'ASIA', CN: 'ASIA', KR: 'ASIA', JP: 'ASIA', AU: 'ASIA',
};

export const regionOf = (country: string): Region => REGION_BY_COUNTRY[country] ?? 'EU';

export const REGION_LABEL: Record<Region, string> = {
  EU: 'Europa',
  CIS: 'CIS',
  SA: 'América do Sul',
  NA: 'América do Norte',
  ASIA: 'Ásia',
};
