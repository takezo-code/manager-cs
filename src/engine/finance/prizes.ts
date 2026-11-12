// Premiação e efeitos do fim de campeonato (dinheiro, bônus de patrocínio, satisfação, MVP e EVPs).
import { MORALE, PRIZE_SHARES } from '../config';
import { roundTo } from '../format';
import { withSatisfaction } from '../morale/satisfaction';
import { grantAwards } from '../tournament/awards';
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

/** Última posição do rótulo ("5º–8º" = 8; "3º" = 3). */
function lastPlace(label: string): number {
  const m = label.match(/–(\d+)º/);
  return m ? parseInt(m[1], 10) : placeNumber(label);
}

/** Prêmio de uma colocação: fração da tabela do formato × prêmio total; faixas recebem a média das posições. */
export function prizeFor(t: Pick<Tournament, 'format' | 'prizePool'>, label: string): number {
  const table = PRIZE_SHARES[t.format];
  const shareAt = (place: number) => {
    let s = 0;
    for (const r of table) if (place >= r.from) s = r.share;
    return s;
  };
  const from = placeNumber(label);
  const to = lastPlace(label);
  let sum = 0;
  for (let p = from; p <= to; p++) sum += shareAt(p);
  return roundTo((sum / (to - from + 1)) * t.prizePool, 10);
}

export function awardTournament(world: World, t: Tournament): World {
  let w = world;
  const half = t.participants.length / 2;
  for (const [teamId, label] of Object.entries(t.placements)) {
    w = addMoney(w, teamId, prizeFor(t, label), 'premiacao', `${t.name} (${label})`);
    const place = placeNumber(label);
    const delta =
      place === 1 ? MORALE.events.title : place === 2 ? MORALE.events.vice : place <= 4 ? MORALE.events.top4 : place > half ? MORALE.events.earlyExit : 0;
    if (delta) {
      const players = { ...w.players };
      for (const pid of w.teams[teamId].playerIds) players[pid] = withSatisfaction(players[pid], delta);
      w = { ...w, players };
    }
  }
  if (t.championId) w = payTitleBonuses(w, t.championId, t.name);
  return grantAwards(w, t);
}
