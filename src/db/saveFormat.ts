// Formato do save: o que vai para o IndexedDB e para o arquivo JSON de backup.
import { INITIAL_PLAYERS, INITIAL_RELATIONS, INITIAL_STAFF, INITIAL_TEAMS } from '../data';
import { addToAcademy, generateYouth } from '../engine/academy';
import { generateAmateurs } from '../engine/amateurs';
import { newBaseSeason } from '../engine/baseLeague';
import { generateTier2 } from '../engine/tier2/model';
import { DEFAULT_PROFILE, newManager } from '../engine/manager/model';
import { assignGoals } from '../engine/manager/board';
import { buildYear, type CalendarEvent } from '../engine/calendar';
import { ACADEMY, AMATEURS, MEDIA } from '../engine/config';
import { START_DATE, addDays } from '../engine/date';
import { createGroup } from '../engine/tournament/doubleElim';
import { initialSponsors } from '../engine/finance/sponsors';
import { relationsFromList } from '../engine/market/relations';
import { DEFAULT_MOOD } from '../engine/morale/satisfaction';
import { createRng, hashString } from '../engine/rng';
import type { Tournament } from '../engine/tournament/types';
import type { MatchResult, Player, Team } from '../engine/types';
import type { World, WorldEvent } from '../engine/world';

/** v1: passo 6. v2: mercado. v3: finanças e satisfação. v4: calendário, ranking, prêmios e treino. v5: academy, olheiro, GC/FACEIT e idade. v6: comissão técnica. v7: carreira do manager. v8: mídia (notícias, Twitter, Instagram, torcida). v9: tier 2 e empréstimos. */
export const SAVE_VERSION = 9;
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

export function buildMeta(state: SavedState): SaveMeta {
  const org = state.manager?.academyOf;
  if (!state.myTeamId && org && state.teams[org])
    return { teamId: org, teamName: `${state.teams[org].name} Academy`, money: state.teams[org].money, date: state.date, status: 'Manager da academy' };
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

/**
 * Atualiza um save antigo para o formato atual.
 * v1 → v2: completa contratos, potencial, região e titulares com os dados iniciais; data, relações e propostas começam do zero.
 */
export function migrateState(raw: Record<string, unknown>, version: number): SavedState {
  let s = raw as unknown as SavedState;
  if (version < 2) s = migrateV1(s);
  if (version < 3) s = migrateV2(s);
  if (version < 4) s = migrateV3(s as SavedState & { tournament?: unknown });
  if (version < 5) s = migrateV4(s);
  if (version < 6) s = migrateV5(s);
  if (version < 7) {
    s = { ...s, manager: s.manager ?? newManager(DEFAULT_PROFILE, s.myTeamId, s.date) };
    if (s.myTeamId && !s.manager.goals.length) s = { ...s, ...assignGoals({ ...s, managerTeamId: s.myTeamId }, s.myTeamId) };
  }
  if (version < 8)
    s = {
      ...s,
      fans: s.fans ?? Object.fromEntries(Object.keys(s.teams).map((id) => [id, MEDIA.startMood])),
      news: s.news ?? [],
      feed: s.feed ?? [],
      posts: s.posts ?? [],
    };
  if (version < 9) s = { ...s, tier2: s.tier2 ?? generateTier2(createRng(hashString(`tier2:migracao:${s.date}`)), s.date) };
  return s;
}

/** v5 → v6: comissão técnica inicial (técnicos reais e profissionais fictícios), como num jogo novo. */
function migrateV5(s: SavedState): SavedState {
  const initTeams = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));
  const staff = Object.fromEntries(INITIAL_STAFF.map((x) => [x.id, structuredClone(x)]));
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(s.teams))
    teams[id] = { ...t, staff: t.staff ?? { ...(initTeams[id]?.staff ?? { tecnico: null, analista: null, psicologo: null }) } };
  // Contratos com datas no futuro do save.
  for (const x of Object.values(staff)) if (x.contract && x.contract.endDate <= s.date) x.contract = { ...x.contract, endDate: addDays(s.date, 365) };
  return { ...s, teams, staff: s.staff ?? staff };
}

/** v4 → v5: elenco principal/academy, crescimento por idade, olheiro nível 1, academies e amadores gerados. */
function migrateV4(s: SavedState): SavedState {
  const rng = createRng(hashString(`migracao-v5:${s.myTeamId}:${s.date}`));
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(s.players)) players[id] = { ...p, squad: p.squad ?? 'principal', growth: p.growth ?? {} };
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(s.teams)) teams[id] = { ...t, academyIds: t.academyIds ?? [], scoutLevel: t.scoutLevel ?? 1 };
  let out: SavedState = {
    ...s,
    players,
    teams,
    amateurs: s.amateurs ?? generateAmateurs(rng, AMATEURS.poolSize, s.date),
    baseLeague: s.baseLeague ?? newBaseSeason(Number(s.date.slice(0, 4))),
  };
  for (const id of Object.keys(out.teams))
    if (!out.teams[id].academyIds.length) out = { ...out, ...addToAcademy(out, id, generateYouth(out, rng, id, ACADEMY.aiSize)) };
  return out;
}

/** Campeonato no formato antigo (v3): tinha `template` em vez de `format`. */
type LegacyTournament = Omit<Tournament, 'format' | 'options' | 'prizePool' | 'playerStats'> & { template?: 'major' | 'iem' };

/**
 * v3 → v4: calendário, ranking dinâmico, prêmios e treino. Um campeonato antigo em andamento vira
 * um evento em andamento no calendário (grupos antigos ganham os campos novos).
 */
function migrateV3(s: SavedState & { tournament?: unknown }): SavedState {
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(s.players))
    players[id] = { ...p, awards: p.awards ?? [], mvpUntil: p.mvpUntil ?? null, trainingGains: p.trainingGains ?? {} };
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(s.teams))
    teams[id] = {
      ...t,
      legacyPoints: t.legacyPoints ?? t.hltvPoints,
      legacyRoster: t.legacyRoster ?? [...t.starters],
      rankHistory: t.rankHistory ?? [],
      training: t.training ?? { mode: 'dividido', focus: 'mira' },
    };
  const year = Number(s.date.slice(0, 4));
  const calendar: CalendarEvent[] = [...buildYear(year).filter((e) => e.startDate > s.date), ...buildYear(year + 1)];
  const old = s.tournament as LegacyTournament | null | undefined;
  if (old && !old.championId) {
    const format = old.template === 'iem' ? 'groups16' : 'major32';
    const stages = old.stages.map((st) =>
      st.kind === 'groups'
        ? { ...st, groups: st.groups.map((g) => ({ ...createGroup(g.name, g.seeds), ...g, kind: 'de8' as const })) }
        : st,
    );
    const tournament: Tournament = { ...old, format, options: {}, prizePool: 1_250_000, playerStats: {}, stages: stages as Tournament['stages'] };
    calendar.unshift({
      id: old.id, templateId: 'legado', name: old.name, city: '', startDate: s.date, endDate: addDays(s.date, 20), format, teams: old.participants.length,
      prizePool: 1_250_000, status: 'em_andamento', invited: [...old.participants], accepted: [...old.participants], declined: [], qualifierSlots: 0,
      qualified: [], tournament,
    });
  }
  const { tournament: _drop, ...rest } = s;
  return { ...rest, players, teams, calendar, results: s.results ?? [], seriesLog: s.seriesLog ?? [] };
}

/** v2 → v3: finanças e satisfação (patrocínios iniciais, humor dos jogadores, extrato e caixa de entrada vazios). */
function migrateV2(s: SavedState): SavedState {
  const rng = createRng(hashString(`migracao:${s.myTeamId}`));
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(s.players)) players[id] = { ...p, mood: p.mood ?? { ...DEFAULT_MOOD } };
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(s.teams))
    teams[id] = { ...t, sponsors: t.sponsors ?? initialSponsors(t, s.date, rng), lateMonths: t.lateMonths ?? 0, arrears: t.arrears ?? 0 };
  return {
    ...s,
    players,
    teams,
    managerTeamId: s.myTeamId,
    ledger: s.ledger ?? [],
    sponsorOffers: s.sponsorOffers ?? [],
    inbox: s.inbox ?? [],
  };
}

function migrateV1(s: SavedState): SavedState {
  const initPlayers = Object.fromEntries(INITIAL_PLAYERS.map((p) => [p.id, p]));
  const initTeams = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, t]));
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(s.players)) {
    const init = initPlayers[id];
    players[id] = {
      ...p,
      potential: p.potential ?? init?.potential ?? 70,
      regionFlex: p.regionFlex ?? init?.regionFlex ?? 0.5,
      transferListed: p.transferListed ?? false,
      contract: p.contract !== undefined ? p.contract : (init?.contract ?? null),
    };
  }
  // Agentes livres que não existiam na v1.
  for (const p of INITIAL_PLAYERS) if (!players[p.id]) players[p.id] = structuredClone(p);
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(s.teams)) {
    const init = initTeams[id];
    teams[id] = { ...t, region: t.region ?? init?.region ?? 'EU', starters: t.starters ?? [...t.playerIds] };
  }
  return {
    ...s,
    teams,
    players,
    date: s.date ?? START_DATE,
    relations: s.relations ?? relationsFromList(INITIAL_RELATIONS),
    offers: s.offers ?? [],
    transferLog: s.transferLog ?? [],
    events: s.events ?? [],
  };
}

/** Valida um JSON importado. Devolve o estado ou uma mensagem de erro em português. */
export function parseImport(text: string): { ok: true; state: SavedState } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!isObj(data) || data.app !== 'manager-cs') return { ok: false, error: 'Esse arquivo não é um save do Manager de CS.' };
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION)
    return { ok: false, error: 'Esse save é de uma versão mais nova do jogo.' };
  const s = data.state;
  if (!isObj(s) || !isObj(s.teams) || !isObj(s.players) || typeof s.myTeamId !== 'string' || (s.myTeamId !== '' && !isObj(s.teams[s.myTeamId])))
    return { ok: false, error: 'O save está incompleto ou corrompido.' };
  const base = {
    ...s,
    seriesResults: isObj(s.seriesResults) ? s.seriesResults : {},
    lastDayIds: Array.isArray(s.lastDayIds) ? s.lastDayIds : [],
  };
  return { ok: true, state: migrateState(base, data.version) };
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
