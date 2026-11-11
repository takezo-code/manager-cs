// MVP e EVPs de um evento (estilo HLTV): maior rating médio entre os times bem colocados.
import { AWARDS } from '../config';
import { addDays } from '../date';
import { placeNumber } from '../finance/prizes';
import type { Player } from '../types';
import type { World } from '../world';
import type { Tournament } from './types';

/** MVP: melhor rating médio entre os times do top 4. EVPs: os seguintes entre os times do top 8. */
export function pickAwards(t: Tournament): { mvp: string | null; evps: string[] } {
  const place = (teamId: string) => placeNumber(t.placements[teamId] ?? '99');
  const ranked = Object.entries(t.playerStats)
    .filter(([, s]) => s.maps >= AWARDS.minMaps)
    .map(([id, s]) => ({ id, avg: s.ratingSum / s.maps, place: place(s.teamId) }))
    .sort((a, b) => b.avg - a.avg);
  const mvp = ranked.find((r) => r.place <= 4)?.id ?? null;
  const evps = ranked
    .filter((r) => r.id !== mvp && r.place <= 8)
    .slice(0, AWARDS.evps)
    .map((r) => r.id);
  return { mvp, evps };
}

/** Registra MVP e EVPs nos jogadores; o MVP ganha +2 em tudo por 365 dias. */
export function grantAwards(world: World, t: Tournament): World {
  const { mvp, evps } = pickAwards(t);
  const players = { ...world.players };
  const give = (id: string, kind: 'MVP' | 'EVP') => {
    const p = players[id];
    if (!p) return;
    players[id] = {
      ...p,
      awards: [...(p.awards ?? []), { kind, event: t.name, date: world.date }],
      mvpUntil: kind === 'MVP' ? addDays(world.date, AWARDS.mvpDays) : (p.mvpUntil ?? null),
    };
  };
  if (mvp) give(mvp, 'MVP');
  for (const id of evps) give(id, 'EVP');
  return { ...world, players };
}

/** Tira o bônus de MVP depois do prazo. */
export const expireMvp = (p: Player, date: string): Player => (p.mvpUntil && p.mvpUntil < date ? { ...p, mvpUntil: null } : p);
