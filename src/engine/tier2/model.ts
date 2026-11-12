// Academies como times de evento (tier 3). O tipo Tier2State fica só para os saves antigos (v9).
import { TIER2 } from '../config';
import { baseOvr } from '../form';
import { regionOf } from '../market/value';
import { hashString } from '../rng';
import type { Tournament } from '../tournament/types';
import { MAP_IDS, type MapId, type Player, type Team } from '../types';
import type { World } from '../world';

export interface Tier2Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  color: string;
  playerIds: string[];
  mapStrength: Record<MapId, number>;
}

export interface Tier2State {
  teams: Record<string, Tier2Team>;
  players: Record<string, Player>;
  /** Pontos da temporada no ranking do tier 2 (academies pelo id virtual). */
  points: Record<string, number>;
  season: number;
  /** Copa em andamento. */
  cup: Tournament | null;
}

const noise = (key: string, spread: number) => ((hashString(key) % 1000) / 1000 - 0.5) * 2 * spread;

function mapStrengthAround(key: string, level: number): Record<MapId, number> {
  return Object.fromEntries(MAP_IDS.map((m) => [m, Math.round(Math.max(40, Math.min(90, level + noise(`${key}:${m}`, 8))))])) as Record<MapId, number>;
}

/** Estado do tier 2 sem os fictícios (saves antigos guardam o formato). */
export const emptyTier2 = (date: string): Tier2State => ({ teams: {}, players: {}, points: {}, season: Number(date.slice(0, 4)), cup: null });

export const academyTeamId = (orgId: string) => `${orgId}-ac`;
export const orgOfAcademy = (teamId: string) => (teamId.endsWith('-ac') ? teamId.slice(0, -3) : null);

/** Monta um Team "jogável" (só o que a simulação usa). */
function asTeam(base: Pick<Team, 'id' | 'name' | 'shortName' | 'country' | 'color' | 'mapStrength'>, roster: string[], rank: number): Team {
  return {
    ...base,
    region: regionOf(base.country),
    hltvRank: rank,
    hltvPoints: 0,
    playerIds: roster,
    starters: roster.slice(0, 5),
    money: 0,
    sponsors: [],
    lateMonths: 0,
    arrears: 0,
    legacyPoints: 0,
    legacyRoster: [],
    rankHistory: [],
    training: { mode: 'dividido', focus: 'mira' },
    academyIds: [],
    scoutLevel: 1,
    staff: { tecnico: null, analista: null, psicologo: null },
  };
}

/** A academy de um time como Team (sem stand-ins), para eventos do tier 3. */
export function academyTeam(w: World, orgId: string): Team {
  const t = w.teams[orgId];
  const id = academyTeamId(orgId);
  const roster = [...academyLineupIds(w, orgId)].sort((a, b) => baseOvr(w.players[b]) - baseOvr(w.players[a]));
  return { ...asTeam({ id, name: `${t.name} Academy`, shortName: `${t.shortName}.A`, country: t.country, color: t.color, mapStrength: mapStrengthAround(id, TIER2.academyMapLevel) }, roster, 1000 + t.hltvRank), region: t.region };
}

/** Times do mundo mais as academies que aparecem em `ids` (para telas de evento). */
export function withAcademyTeams(w: World, ids: Iterable<string>): Record<string, Team> {
  const out = { ...w.teams };
  for (const id of ids) {
    const org = orgOfAcademy(id);
    if (!out[id] && org && w.teams[org]) out[id] = academyTeam(w, org);
  }
  return out;
}

/** Jovens da academy que jogam pela academy (os emprestados jogam no time do empréstimo). */
export const academyLineupIds = (w: World, orgId: string) =>
  (w.teams[orgId]?.academyIds ?? []).filter((id) => w.players[id] && !w.players[id].loan);
