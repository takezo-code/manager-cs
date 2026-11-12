// Ranking das academies na temporada: pontos pelas colocações nos eventos tier 3 do ano.
import { placeNumber } from '../finance/prizes';
import type { World } from '../world';
import { academyTeamId, orgOfAcademy } from './model';

/** Pontos pela colocação num evento tier 3. */
export function academyPoints(label: string): number {
  const n = placeNumber(label);
  if (n === 1) return 100;
  if (n === 2) return 70;
  if (n <= 4) return 50;
  return 20;
}

/** Todas as academies, da que mais pontuou no tier 3 do ano para a que menos pontuou. */
export function academyRanking(w: World, year = Number(w.date.slice(0, 4))): Array<{ teamId: string; name: string; points: number; events: number }> {
  const points: Record<string, number> = {};
  const events: Record<string, number> = {};
  for (const e of w.calendar) {
    if (e.tier !== 3 || !e.startDate.startsWith(String(year)) || !e.tournament) continue;
    for (const id of e.tournament.participants) if (orgOfAcademy(id)) events[id] = (events[id] ?? 0) + 1;
    if (e.status === 'encerrado')
      for (const [id, label] of Object.entries(e.tournament.placements)) if (orgOfAcademy(id)) points[id] = (points[id] ?? 0) + academyPoints(label);
  }
  return Object.values(w.teams)
    .map((t) => ({ teamId: academyTeamId(t.id), name: `${t.name} Academy`, points: points[academyTeamId(t.id)] ?? 0, events: events[academyTeamId(t.id)] ?? 0 }))
    .sort((a, b) => b.points - a.points || b.events - a.events || a.name.localeCompare(b.name));
}
