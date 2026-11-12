// Efeitos da comissão técnica na partida. As fórmulas estão em STAFF (config).
import { STAFF } from '../config';
import type { StaffAttr } from '../types';
import type { World } from '../world';
import { staffAttr } from './model';

export type StaffAttrs = Record<StaffAttr, number>;

const KEYS: StaffAttr[] = ['TAT', 'VET', 'GES', 'LEI', 'PRE', 'PRS', 'MOT'];

/** Atributos efetivos do staff de um time (50 nos cargos vagos). */
export function staffAttrsOf(w: World, teamId: string): StaffAttrs {
  return Object.fromEntries(KEYS.map((k) => [k, staffAttr(w, teamId, k)])) as StaffAttrs;
}

/** Tática: soma ao bônus de chamada do time. */
export const tacticBonus = (tat: number) => (tat - 70) * STAFF.tacticWeight;
/** Veto: amplitude do ruído (±), de 1 (Veto 95) a 8 (Veto 40). */
export const vetoNoise = (vet: number) => 1 + ((STAFF.maxAttr - vet) / (STAFF.maxAttr - STAFF.minAttr)) * 7;
/** Leitura: erro máximo (±) ao ler a força do rival em cada mapa. */
export const readError = (lei: number) => (STAFF.maxAttr - lei) / 5;
/** Preparação: bônus nos duelos dos primeiros rounds de cada mapa. */
export const prepBonus = (pre: number) => (pre - 70) * STAFF.prepWeight;
/** Pressão: multiplica a penalidade de pressão em playoffs e final. */
export const pressureFactor = (prs: number) => 1 - (prs - STAFF.minAttr) / 110;
