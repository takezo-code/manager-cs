// Passagem do tempo: um dia de cada vez. No dia 1º fecha o mês (finanças, satisfação, pedidos).
import { INITIAL_PLAYERS, INITIAL_RELATIONS, INITIAL_TEAMS } from '../data';
import { START_DATE, addDays } from './date';
import { monthlyFinance } from './finance/monthly';
import { initialSponsors } from './finance/sponsors';
import { aiMarketDay } from './market/ai';
import { relationsFromList } from './market/relations';
import { expireInbox, monthlyRequests } from './morale/conversations';
import { monthlySatisfaction } from './morale/satisfaction';
import { createRng, hashString, type Rng } from './rng';
import type { World, WorldEvent } from './world';

/** Mundo de um jogo novo: dados dos JSONs + patrocínios iniciais. */
export function createWorld(managerTeamId: string, seed = 1): World {
  const rng = createRng(hashString(`mundo:${seed}`));
  const teams = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, structuredClone(t)]));
  for (const t of Object.values(teams)) t.sponsors = initialSponsors(t, START_DATE, rng);
  return {
    date: START_DATE,
    managerTeamId,
    teams,
    players: Object.fromEntries(INITIAL_PLAYERS.map((p) => [p.id, structuredClone(p)])),
    relations: relationsFromList(INITIAL_RELATIONS),
    offers: [],
    transferLog: [],
    ledger: [],
    sponsorOffers: [],
    inbox: [],
  };
}

export const isFirstOfMonth = (date: string) => date.endsWith('-01');

/** Avança um dia. Mercado da IA só roda com o mercado aberto (fora de campeonato). */
export function dailyTick(world: World, opts: { marketOpen: boolean; rng?: Rng }): { world: World; events: WorldEvent[] } {
  let w: World = { ...world, date: addDays(world.date, 1) };
  const rng = opts.rng ?? createRng(hashString(`${w.date}:${w.managerTeamId}`));
  const events: WorldEvent[] = [];
  const add = (out: { world: World; events: WorldEvent[] }) => {
    w = out.world;
    events.push(...out.events);
  };

  if (isFirstOfMonth(w.date)) {
    add(monthlyFinance(w, rng));
    w = monthlySatisfaction(w);
    add(monthlyRequests(w));
  }
  add(expireInbox(w));
  w = { ...w, sponsorOffers: w.sponsorOffers.filter((o) => o.expires >= w.date) };
  if (opts.marketOpen) add(aiMarketDay(w, w.managerTeamId, rng));
  return { world: w, events };
}
