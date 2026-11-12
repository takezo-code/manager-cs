// Virada do ano: agentes livres velhos ou fracos deixam o jogo, e o total de livres tem teto.
import { MARKET } from '../config';
import { baseOvr } from '../form';
import type { World } from '../world';

export function retireFreeAgents(w: World): World {
  const free = Object.values(w.players).filter((p) => !p.teamId);
  const gone = new Set(free.filter((p) => p.age >= MARKET.freeAgentRetireAge || baseOvr(p) < MARKET.freeAgentMinOvr).map((p) => p.id));
  const left = free.filter((p) => !gone.has(p.id)).sort((a, b) => baseOvr(b) - baseOvr(a));
  for (const p of left.slice(MARKET.freeAgentCap)) gone.add(p.id);
  if (!gone.size) return w;
  const players = { ...w.players };
  for (const id of gone) delete players[id];
  return { ...w, players };
}
