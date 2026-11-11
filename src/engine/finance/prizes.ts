// Premiação e efeitos do fim de campeonato (dinheiro, bônus de patrocínio e satisfação).
import { MORALE, PRIZES } from '../config';
import { applySatisfaction } from '../morale/satisfaction';
import type { Tournament } from '../tournament/types';
import type { World } from '../world';
import { addMoney } from '../world';
import { payTitleBonuses } from './sponsors';

/** Posição inicial de um rótulo de colocação ("Campeão" = 1, "Vice" = 2, "5º–8º" = 5). */
export function placeNumber(label: string): number {
  if (label === 'Campeão') return 1;
  if (label === 'Vice') return 2;
  return parseInt(label, 10) || 99;
}

export function prizeFor(template: Tournament['template'], label: string): number {
  const place = placeNumber(label);
  const table = PRIZES[template];
  let amount = 0;
  for (const r of table) if (place >= r.from) amount = r.amount;
  return place > 32 ? 0 : amount;
}

export function awardTournament(world: World, t: Tournament): World {
  let w = world;
  const half = t.participants.length / 2;
  for (const [teamId, label] of Object.entries(t.placements)) {
    w = addMoney(w, teamId, prizeFor(t.template, label), 'premiacao', `${t.name} (${label})`);
    const place = placeNumber(label);
    const delta =
      place === 1 ? MORALE.events.title : place === 2 ? MORALE.events.vice : place <= 4 ? MORALE.events.top4 : place > half ? MORALE.events.earlyExit : 0;
    if (delta) for (const pid of w.teams[teamId].playerIds) w = applySatisfaction(w, pid, delta);
  }
  if (t.championId) w = payTitleBonuses(w, t.championId, t.name);
  return w;
}
