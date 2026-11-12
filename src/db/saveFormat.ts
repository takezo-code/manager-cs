// Formato do save: o que vai para o IndexedDB e para o arquivo JSON de backup.
import type { MatchResult } from '../engine/types';
import type { World, WorldEvent } from '../engine/world';

/** v11: 32 times, só tier 1. Saves de versões anteriores não abrem mais (comece uma carreira nova). */
export const SAVE_VERSION = 11;
export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

/** Parte do estado do jogo que é salva. */
export interface SavedState extends World {
  events: Array<WorldEvent & { date: string }>;
  myTeamId: string;
  seriesResults: Record<string, MatchResult>;
  lastDayIds: string[];
}

export interface SaveMeta {
  teamId: string;
  teamName: string;
  money: number;
  date: string;
  /** Ex.: "PGL Major Singapura 2026 · Dia 5". */
  status: string;
}

export interface SaveRecord {
  slot: Slot;
  version: number;
  updatedAt: number;
  meta: SaveMeta;
  state: SavedState;
}

/** O save abre nesta versão do jogo? */
export const isCompatible = (version: number) => version === SAVE_VERSION;

export function buildMeta(state: SavedState): SaveMeta {
  if (!state.myTeamId) return { teamId: '', teamName: 'Sem time', money: 0, date: state.date, status: 'Desempregado' };
  const team = state.teams[state.myTeamId];
  const me = state.myTeamId;
  const playing = state.calendar.find((e) => e.status === 'em_andamento' && e.tournament?.participants.includes(me) && !e.tournament.placements[me]);
  const next = state.calendar.find((e) => e.status !== 'encerrado' && e.startDate > state.date && (e.accepted.includes(me) || e.qualified.includes(me)));
  const status = playing
    ? `Jogando ${playing.name} · Dia ${playing.tournament!.day}`
    : next
      ? `Próximo: ${next.name}`
      : `#${team.hltvRank} no ranking HLTV`;
  return { teamId: team.id, teamName: team.name, money: team.money, date: state.date, status };
}

export function makeRecord(slot: Slot, state: SavedState, now = Date.now()): SaveRecord {
  return { slot, version: SAVE_VERSION, updatedAt: now, meta: buildMeta(state), state };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Valida um JSON importado. Devolve o estado ou uma mensagem de erro em português. */
export function parseImport(text: string): { ok: true; state: SavedState } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!isObj(data) || data.app !== 'manager-cs') return { ok: false, error: 'Esse arquivo não é um save do Manager de CS.' };
  if (typeof data.version !== 'number' || !isCompatible(data.version))
    return { ok: false, error: 'Esse save é de outra versão do jogo e não abre mais. Comece uma carreira nova.' };
  const s = data.state;
  if (!isObj(s) || !isObj(s.teams) || !isObj(s.players) || typeof s.myTeamId !== 'string' || (s.myTeamId !== '' && !isObj(s.teams[s.myTeamId])))
    return { ok: false, error: 'O save está incompleto ou corrompido.' };
  const state = {
    ...s,
    seriesResults: isObj(s.seriesResults) ? s.seriesResults : {},
    lastDayIds: Array.isArray(s.lastDayIds) ? s.lastDayIds : [],
  } as unknown as SavedState;
  return { ok: true, state };
}

/** Conteúdo do arquivo de backup. */
export function exportJson(record: SaveRecord): string {
  return JSON.stringify({ app: 'manager-cs', version: record.version, exportedAt: new Date().toISOString(), meta: record.meta, state: record.state });
}

export function exportFileName(record: SaveRecord): string {
  const date = new Date(record.updatedAt).toISOString().slice(0, 10);
  const team = record.meta.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `manager-cs-slot${record.slot}-${team}-${date}.json`;
}
