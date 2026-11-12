// O manager: perfil, atributos (crescem com a experiência), reputação, diretoria e histórico.
import { MANAGER } from '../config';

/** Negociação, Finanças, Comunicação, Olho pra talento, Gestão de vestiário. */
export type ManagerAttr = 'NEG' | 'FIN' | 'COM' | 'TAL' | 'VES';
export const MANAGER_ATTRS: readonly ManagerAttr[] = ['NEG', 'FIN', 'COM', 'TAL', 'VES'];

export type GoalKind = 'titulo' | 'top5' | 'top10' | 'top20' | 'major_top8' | 'jogar_major' | 'caixa';

export interface Goal {
  kind: GoalKind;
  text: string;
}

export interface Stint {
  teamId: string;
  from: string;
  to: string | null;
  /** Por que saiu: "demitido", "pediu demissão", "aceitou proposta". */
  reason: string | null;
}

export interface Deal {
  playerId: string;
  nick: string;
  fee: number;
  date: string;
  teamId: string;
}

export interface ManagerProfile {
  name: string;
  age: number;
  country: string;
}

export interface Manager extends ManagerProfile {
  /** Tamanho do clube quando as metas foram definidas (define a paciência da diretoria). */
  clubSize: 'grande' | 'medio' | 'pequeno';
  attrs: Record<ManagerAttr, number>;
  /** 0 a 100. */
  reputation: number;
  /** Confiança da diretoria, 0 a 100. */
  confidence: number;
  /** Metas da temporada e o ano em que serão avaliadas (31/12). */
  goals: Goal[];
  goalsSeason: number;
  /** Salário mensal do manager (US$). */
  salary: number;
  stints: Stint[];
  titles: Array<{ event: string; date: string; teamId: string }>;
  bestRank: number | null;
  buys: Deal[];
  sales: Deal[];
}

export const DEFAULT_PROFILE: ManagerProfile = { name: 'Manager', age: 35, country: 'BR' };

export function newManager(profile: ManagerProfile, teamId: string, date: string): Manager {
  return {
    ...profile,
    attrs: { NEG: MANAGER.startAttr, FIN: MANAGER.startAttr, COM: MANAGER.startAttr, TAL: MANAGER.startAttr, VES: MANAGER.startAttr },
    reputation: MANAGER.startReputation,
    confidence: MANAGER.startConfidence,
    goals: [],
    clubSize: 'pequeno',
    goalsSeason: Number(date.slice(0, 4)),
    salary: managerSalary(MANAGER.startReputation),
    stints: teamId ? [{ teamId, from: date, to: null, reason: null }] : [],
    titles: [],
    bestRank: null,
    buys: [],
    sales: [],
  };
}

/** Salário mensal pedido conforme a reputação. */
export const managerSalary = (reputation: number) => MANAGER.salaryBase + Math.round(reputation) * MANAGER.salaryPerRep;

/** 0 com o atributo inicial (30), 1 no máximo (100). */
export const attrEffect = (m: Manager, k: ManagerAttr) => Math.max(0, (m.attrs[k] - MANAGER.startAttr) / (100 - MANAGER.startAttr));

export type ReputationBand = 'Desconhecido' | 'Promissor' | 'Respeitado' | 'Renomado' | 'Lenda';

export function reputationBand(rep: number): ReputationBand {
  if (rep < 20) return 'Desconhecido';
  if (rep < 40) return 'Promissor';
  if (rep < 60) return 'Respeitado';
  if (rep < 80) return 'Renomado';
  return 'Lenda';
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const gainAttr = (m: Manager, k: ManagerAttr, amount: number): Manager => ({
  ...m,
  attrs: { ...m.attrs, [k]: clamp(m.attrs[k] + amount, 1, 100) },
});

export const gainReputation = (m: Manager, amount: number): Manager => ({ ...m, reputation: clamp(m.reputation + amount, 0, 100) });

export const gainConfidence = (m: Manager, amount: number): Manager => ({ ...m, confidence: clamp(m.confidence + amount, 0, 100) });
