// Tier 2 Cup: uma copa por mês (fev–nov, começando no dia 5), 16 times no formato suíço com playoffs.
import { DEVELOPMENT, TIER2 } from '../config';
import { developPlayer } from '../development';
import { recoverRest } from '../form';
import { placeNumber } from '../finance/prizes';
import { hashString, type Rng } from '../rng';
import { createTournament, playDay } from '../tournament/run';
import type { Player } from '../types';
import type { World, WorldEvent } from '../world';
import { academyTeamId, orgOfAcademy, tier2PlayersView, tier2Teams } from './model';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Pontos no ranking do tier 2 pela colocação na copa. */
export function cupPoints(label: string): number {
  const n = placeNumber(label);
  if (n === 1) return 100;
  if (n === 2) return 70;
  if (n <= 4) return 50;
  if (n <= 8) return 30;
  if (n <= 11) return 15;
  return 5;
}

export { managerOrg } from '../manager/model';
import { managerOrg } from '../manager/model';

/** Dia 5 de fevereiro a novembro: abre a copa com os 16 de mais pontos (a academy do manager entra sempre). */
export function startCup(w: World, rng: Rng): World {
  const month = Number(w.date.slice(5, 7));
  if (w.tier2.cup || w.date.slice(8, 10) !== TIER2.cupDay || month < TIER2.firstMonth || month > TIER2.lastMonth) return w;
  const all = Object.keys(tier2Teams(w));
  const pts = (id: string) => w.tier2.points[id] ?? 0;
  const tiebreak = (id: string) => hashString(`${w.date}:${id}`);
  let chosen: string[];
  if (all.every((id) => pts(id) === 0)) {
    const academies = all.filter((id) => orgOfAcademy(id));
    const fict = all.filter((id) => !orgOfAcademy(id));
    const shuffle = (ids: string[]) => {
      const out = [...ids];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    chosen = [...shuffle(academies).slice(0, TIER2.cupTeams / 2), ...shuffle(fict).slice(0, TIER2.cupTeams / 2)];
  } else {
    chosen = [...all].sort((a, b) => pts(b) - pts(a) || tiebreak(a) - tiebreak(b)).slice(0, TIER2.cupTeams);
  }
  const org = managerOrg(w);
  const mine = org ? academyTeamId(org) : null;
  if (mine && all.includes(mine) && !chosen.includes(mine)) chosen = [...chosen.slice(0, TIER2.cupTeams - 1), mine];
  chosen.sort((a, b) => pts(b) - pts(a) || tiebreak(a) - tiebreak(b));
  const name = `Tier 2 Cup de ${MONTHS[month - 1]} ${w.date.slice(0, 4)}`;
  const cup = createTournament({ id: `t2cup-${w.date.slice(0, 7)}`, name, format: 'swiss16', prizePool: 0 }, chosen, hashString(name));
  return { ...w, tier2: { ...w.tier2, cup } };
}

/** Joga um dia da copa; no fim, distribui os pontos. */
export function cupDay(world: World): World {
  return cupDayWithEvents(world).world;
}

export function cupDayWithEvents(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const cup = w.tier2.cup;
  if (!cup) return { world: w, events: [] };
  const view = tier2PlayersView(w);
  const out = playDay(cup, tier2Teams(w), view);
  // Devolve os jogadores a cada cadastro; amadores (stand-ins) não guardam nada.
  const players = { ...w.players };
  const t2 = { ...w.tier2.players };
  const put = (p: Player) => {
    if (players[p.id]) players[p.id] = p;
    else if (t2[p.id]) t2[p.id] = p;
  };
  for (const p of Object.values(out.players)) if (p !== view[p.id]) put(p);
  // Quem tem até 21 anos cresce a cada mapa jogado.
  for (const r of Object.values(out.results))
    for (const m of r.maps)
      for (const pid of Object.keys(m.stats)) {
        const p = players[pid] ?? t2[pid];
        if (p && p.age <= DEVELOPMENT.youngAge) put(developPlayer(p, DEVELOPMENT.perMapYoung));
      }
  w = { ...w, players, tier2: { ...w.tier2, players: t2, cup: out.tournament } };
  const events: WorldEvent[] = [];
  const t = out.tournament;
  if (t.championId) {
    const points = { ...w.tier2.points };
    for (const [id, label] of Object.entries(t.placements)) points[id] = (points[id] ?? 0) + cupPoints(label);
    w = { ...w, tier2: { ...w.tier2, points, cup: null } };
    const teams = tier2Teams(w);
    const org = managerOrg(w);
    const mine = org ? academyTeamId(org) : null;
    const myPlace = mine ? t.placements[mine] : undefined;
    events.push({ kind: myPlace === 'Campeão' ? 'ok' : 'info', text: `${t.name}: campeão ${teams[t.championId]?.name ?? t.championId}.${myPlace ? ` Sua academy: ${myPlace}.` : ''}` });
  }
  return { world: w, events };
}

/** Sem copa em andamento: jovens das academies, emprestados e jogadores do tier 2 descansam. */
export function restTier2(w: World): World {
  if (w.tier2.cup) return w;
  const players = { ...w.players };
  for (const t of Object.values(w.teams))
    for (const id of t.academyIds ?? []) if (players[id] && players[id].energy < 100) players[id] = recoverRest(players[id]);
  const t2 = Object.fromEntries(Object.entries(w.tier2.players).map(([id, p]) => [id, p.energy < 100 ? recoverRest(p) : p]));
  return { ...w, players, tier2: { ...w.tier2, players: t2 } };
}

/** Virada do ano: ranking do tier 2 zera. */
export const newTier2Season = (w: World, year: number): World => ({ ...w, tier2: { ...w.tier2, season: year, points: {}, cup: null } });

export function tier2Ranking(w: World): Array<{ teamId: string; name: string; points: number }> {
  const teams = tier2Teams(w);
  return Object.values(teams)
    .map((t) => ({ teamId: t.id, name: t.name, points: w.tier2.points[t.id] ?? 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
