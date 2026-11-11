// Liga de base: as academies jogam uma MD1 simulada toda segunda, de fevereiro a novembro.
import { BASE_LEAGUE, DEVELOPMENT } from './config';
import { developPlayer } from './development';
import { baseOvr } from './form';
import type { Rng } from './rng';
import type { World } from './world';

export interface BaseGame {
  a: string;
  b: string;
  winner: string;
  /** Vitória por W.O. (um dos lados não tinha 5 jogadores). */
  wo: boolean;
}

export interface BaseLeague {
  season: number;
  table: Record<string, { w: number; l: number }>;
  lastRound: BaseGame[];
}

export const newBaseSeason = (season: number): BaseLeague => ({ season, table: {}, lastRound: [] });

/** Os 5 melhores da academy (ou menos, se não houver). */
function lineup(w: World, teamId: string) {
  return (w.teams[teamId].academyIds ?? [])
    .map((id) => w.players[id])
    .filter(Boolean)
    .sort((x, y) => baseOvr(y) - baseOvr(x))
    .slice(0, 5);
}

export function playBaseRound(world: World, rng: Rng): World {
  const month = Number(world.date.slice(5, 7));
  const league = world.baseLeague ?? newBaseSeason(Number(world.date.slice(0, 4)));
  if (month < BASE_LEAGUE.firstMonth || month > BASE_LEAGUE.lastMonth) return { ...world, baseLeague: { ...league, lastRound: [] } };

  const ids = Object.keys(world.teams);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const players = { ...world.players };
  const table = { ...league.table };
  const games: BaseGame[] = [];
  const mark = (id: string, won: boolean) => {
    const row = table[id] ?? { w: 0, l: 0 };
    table[id] = won ? { ...row, w: row.w + 1 } : { ...row, l: row.l + 1 };
  };

  for (let i = 0; i + 1 < ids.length; i += 2) {
    const [a, b] = [ids[i], ids[i + 1]];
    const la = lineup(world, a);
    const lb = lineup(world, b);
    let winner: string;
    const wo = la.length < 5 || lb.length < 5;
    if (wo) {
      // Os dois incompletos: decide no sorteio.
      winner = la.length < 5 && lb.length < 5 ? (rng.chance(0.5) ? a : b) : la.length < 5 ? b : a;
    } else {
      const avg = (l: typeof la) => l.reduce((s, p) => s + baseOvr(p), 0) / l.length;
      const pA = 1 / (1 + Math.exp(-(avg(la) - avg(lb)) / BASE_LEAGUE.ratingScale));
      winner = rng.chance(pA) ? a : b;
      for (const p of [...la, ...lb]) {
        if (p.age <= DEVELOPMENT.youngAge) players[p.id] = developPlayer(players[p.id], DEVELOPMENT.perMapYoung);
      }
    }
    mark(a, winner === a);
    mark(b, winner === b);
    games.push({ a, b, winner, wo });
  }
  return { ...world, players, baseLeague: { ...league, table, lastRound: games } };
}

/** Tabela da liga de base: todos os times, por vitórias. */
export function baseStandings(w: World) {
  return Object.keys(w.teams)
    .map((teamId) => ({ teamId, ...(w.baseLeague?.table[teamId] ?? { w: 0, l: 0 }) }))
    .sort((x, y) => y.w - x.w || x.l - y.l);
}
