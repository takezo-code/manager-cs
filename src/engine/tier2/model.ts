// Tier 2: as academies dos 32 times (montadas na hora a partir de Team.academyIds) e 16 times fictícios.
// Os jogadores fictícios ficam em World.tier2.players, fora do mercado do tier 1.
import { makeYoungPlayer } from '../academy';
import { TIER2 } from '../config';
import { baseOvr } from '../form';
import { regionOf } from '../market/value';
import { hashString, type Rng } from '../rng';
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

const NAMES: Array<[string, string, string, string]> = [
  ['nova', 'Nova Esports', 'NOVA', 'BR'],
  ['lumen', 'Lumen Gaming', 'LMN', 'PT'],
  ['kraken', 'Kraken CS', 'KRK', 'SE'],
  ['volt', 'Volt Club', 'VOLT', 'DE'],
  ['atlas', 'Atlas Esports', 'ATL', 'US'],
  ['ember', 'Ember', 'EMB', 'GB'],
  ['ronin', 'Ronin Squad', 'RON', 'DK'],
  ['vortex', 'Vortex', 'VTX', 'PL'],
  ['solaris', 'Solaris', 'SOL', 'ES'],
  ['ironwolves', 'Iron Wolves', 'IRW', 'RU'],
  ['neonowls', 'Neon Owls', 'OWL', 'UA'],
  ['zenith', 'Zenith', 'ZEN', 'FR'],
  ['corvus', 'Corvus', 'CRV', 'FI'],
  ['tempest', 'Tempest', 'TMP', 'CZ'],
  ['orbit', 'Orbit Gaming', 'ORB', 'AR'],
  ['hydra', 'Hydra', 'HYD', 'KZ'],
];
const COLORS = ['#7c5cff', '#00b3a4', '#ff7a33', '#e0313b', '#3ddc84', '#5b9dff', '#e8b04a', '#ff4fa3'];

const noise = (key: string, spread: number) => ((hashString(key) % 1000) / 1000 - 0.5) * 2 * spread;

function mapStrengthAround(key: string, level: number): Record<MapId, number> {
  return Object.fromEntries(MAP_IDS.map((m) => [m, Math.round(Math.max(40, Math.min(90, level + noise(`${key}:${m}`, 8))))])) as Record<MapId, number>;
}

/** Times e jogadores fictícios do tier 2. */
export function generateTier2(rng: Rng, date: string): Tier2State {
  const teams: Record<string, Tier2Team> = {};
  const players: Record<string, Player> = {};
  NAMES.forEach(([key, name, shortName, country], i) => {
    const id = `t2-${key}`;
    const ids: string[] = [];
    for (let n = 0; n < TIER2.rosterSize; n++) {
      const pid = `${id}-${n + 1}`;
      const p0 = makeYoungPlayer(rng, pid, id, country, date, [TIER2.levelMin, TIER2.levelMax]);
      const ovr = baseOvr(p0);
      players[pid] = { ...p0, age: rng.int(TIER2.ageMin, TIER2.ageMax), squad: 'principal', contract: null, potential: Math.min(95, ovr + rng.int(0, 10)) };
      ids.push(pid);
    }
    teams[id] = { id, name, shortName, country, color: COLORS[i % COLORS.length], playerIds: ids, mapStrength: mapStrengthAround(id, 68) };
  });
  return { teams, players, points: {}, season: Number(date.slice(0, 4)), cup: null };
}

/** Virada do ano: fictícios com 32+ se aposentam e dão lugar a um jovem (18–22). */
export function retireTier2(w: World, rng: Rng): World {
  const players = { ...w.tier2.players };
  const teams = { ...w.tier2.teams };
  for (const t of Object.values(teams)) {
    const ids = t.playerIds.map((id) => {
      const p = players[id];
      if (!p || p.age < TIER2.retireAge) return id;
      delete players[id];
      let nid = '';
      do nid = `${t.id}-${rng.int(100, 999)}`;
      while (players[nid]);
      const y = makeYoungPlayer(rng, nid, t.id, t.country, w.date, [TIER2.levelMin, TIER2.levelMax]);
      players[nid] = { ...y, age: rng.int(TIER2.ageMin, TIER2.rookieMaxAge), squad: 'principal', contract: null, potential: Math.min(95, baseOvr(y) + rng.int(0, 12)) };
      return nid;
    });
    teams[t.id] = { ...t, playerIds: ids };
  }
  return { ...w, tier2: { ...w.tier2, teams, players } };
}

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

/** Jovens da academy que jogam pela academy (os emprestados jogam no time do empréstimo). */
export const academyLineupIds = (w: World, orgId: string) =>
  (w.teams[orgId]?.academyIds ?? []).filter((id) => w.players[id] && !w.players[id].loan);

/** Todos os times do tier 2 como Team, com stand-ins amadores nas academies incompletas. */
export function tier2Teams(w: World): Record<string, Team> {
  const out: Record<string, Team> = {};
  const view = tier2PlayersView(w);
  const byOvr = (ids: string[]) => [...ids].sort((a, b) => baseOvr(view[b]) - baseOvr(view[a]));
  const standins = [...(w.amateurs ?? [])].sort((a, b) => baseOvr(b.player) - baseOvr(a.player)).map((a) => a.player.id);
  let next = 0;
  const rank = (id: string) => 1000 - (w.tier2?.points[id] ?? 0);
  for (const t of Object.values(w.teams)) {
    const id = academyTeamId(t.id);
    const roster = byOvr(academyLineupIds(w, t.id));
    while (roster.length < 5 && next < standins.length) roster.push(standins[next++]);
    out[id] = asTeam({ id, name: `${t.name} Academy`, shortName: `${t.shortName}.A`, country: t.country, color: t.color, mapStrength: mapStrengthAround(id, TIER2.academyMapLevel) }, roster, rank(id));
  }
  for (const t of Object.values(w.tier2?.teams ?? {})) {
    const loaned = Object.values(w.players).filter((p) => p.loan?.teamId === t.id).map((p) => p.id);
    out[t.id] = asTeam(t, byOvr([...t.playerIds, ...loaned]), rank(t.id));
  }
  return out;
}

/** Jogadores que podem aparecer no tier 2: os do jogo, os fictícios e os amadores (stand-ins). */
export function tier2PlayersView(w: World): Record<string, Player> {
  const amateurs = Object.fromEntries((w.amateurs ?? []).map((a) => [a.player.id, a.player]));
  return { ...amateurs, ...(w.tier2?.players ?? {}), ...w.players };
}
