// Passagem do tempo: um dia de cada vez (calendário, treino, fechamento do mês, ranking e mercado).
import { INITIAL_PLAYERS, INITIAL_RELATIONS, INITIAL_STAFF, INITIAL_TEAMS } from '../data';
import { generateTier2 } from './tier2/model';
import { cupDayWithEvents, newTier2Season, startCup } from './tier2/cups';
import { mediaDay } from './media/day';
import { addToAcademy, generateYouth } from './academy';
import { buildYear, teamBusy } from './calendar';
import { generateAmateurs, refreshAmateurs } from './amateurs';
import { academyAgingWarning, academyYearEnd } from './academy';
import { ageUp, monthlyDevelopment } from './development';
import { newBaseSeason, playBaseRound } from './baseLeague';
import { DEFAULT_PROFILE, newManager, type ManagerProfile } from './manager/model';
import { managerDealsDay, monthlyManagerGrowth } from './manager/effects';
import { assignGoals, evaluateSeason } from './manager/board';
import { expireManagerOffers, monthlyManagerOffers, weeklyUnemployedOffers } from './manager/offers';
import { trackHistory } from './manager/history';
import { finishCourses, monthlyStaffOffers } from './staff/career';
import { staffMarketDay } from './staff/market';
import { ACADEMY, AMATEURS, MEDIA } from './config';
import { START_DATE, addDays, daysBetween } from './date';
import { monthlyFinance } from './finance/monthly';
import { recoverRest } from './form';
import { initialSponsors } from './finance/sponsors';
import { aiMarketDay } from './market/ai';
import { relationsFromList } from './market/relations';
import { expireInbox, monthlyRequests } from './morale/conversations';
import { monthlySatisfaction } from './morale/satisfaction';
import { applyRanking } from './ranking';
import { createRng, hashString, type Rng } from './rng';
import { issueInvites, playEvents, runQualifiers, startEvents } from './schedule';
import { expireMvp } from './tournament/awards';
import { trainDay } from './training';
import type { MatchResult } from './types';
import type { World, WorldEvent } from './world';

/** Mundo de um jogo novo: dados dos JSONs + patrocínios iniciais. */
export function createWorld(managerTeamId: string, seed = 1, profile: ManagerProfile = DEFAULT_PROFILE): World {
  const rng = createRng(hashString(`mundo:${seed}`));
  const teams = Object.fromEntries(INITIAL_TEAMS.map((t) => [t.id, structuredClone(t)]));
  for (const t of Object.values(teams)) t.sponsors = initialSponsors(t, START_DATE, rng);
  let w: World = {
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
    results: [],
    seriesLog: [],
    // Eventos de 2026 que ainda não começaram + o ano seguinte.
    calendar: [...buildYear(2026).filter((e) => e.startDate > START_DATE), ...buildYear(2027)],
    amateurs: [],
    baseLeague: newBaseSeason(Number(START_DATE.slice(0, 4))),
    staff: Object.fromEntries(INITIAL_STAFF.map((s) => [s.id, structuredClone(s)])),
    manager: newManager(profile, managerTeamId, START_DATE),
    fans: Object.fromEntries(Object.keys(teams).map((id) => [id, MEDIA.startMood])),
    news: [],
    feed: [],
    posts: [],
    tier2: generateTier2(createRng(hashString(`tier2:${seed}`)), START_DATE),
  };
  w = { ...w, amateurs: generateAmateurs(rng, AMATEURS.poolSize, START_DATE) };
  if (managerTeamId) w = assignGoals(w, managerTeamId);
  // Academy inicial de cada time.
  for (const id of Object.keys(w.teams)) w = addToAcademy(w, id, generateYouth(w, rng, id, ACADEMY.aiSize));
  return w;
}

export const isFirstOfMonth = (date: string) => date.endsWith('-01');
const isMonday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1;

/**
 * Avança um dia: calendário (convites, qualificatórias, eventos), treino/descanso de quem está livre,
 * fechamento do mês, ranking às segundas e mercado da IA (que respeita as janelas).
 */
export function dailyTick(world: World, opts: { rng?: Rng } = {}): { world: World; events: WorldEvent[]; results: Record<string, MatchResult> } {
  let w: World = { ...world, date: addDays(world.date, 1) };
  const rng = opts.rng ?? createRng(hashString(`${w.date}:${w.managerTeamId}`));
  const events: WorldEvent[] = [];
  const add = (out: { world: World; events: WorldEvent[] }) => {
    w = out.world;
    events.push(...out.events);
  };

  // Calendário do ano seguinte a partir de novembro (os convites de janeiro saem em dezembro).
  const year = Number(w.date.slice(0, 4));
  if (w.date.slice(5, 7) >= '11' && !w.calendar.some((e) => e.startDate.startsWith(String(year + 1))))
    w = { ...w, calendar: [...w.calendar, ...buildYear(year + 1)] };
  w = { ...w, players: Object.fromEntries(Object.entries(w.players).map(([id, p]) => [id, expireMvp(p, w.date)])) };

  add(issueInvites(w));
  add(expireInbox(w));
  add(runQualifiers(w));
  add(startEvents(w));
  const played = playEvents(w);
  add(played);

  // Dias livres: treino/descanso para quem não está em evento; agentes livres descansam.
  for (const t of Object.values(w.teams)) if (!teamBusy(w.calendar, t.id)) w = trainDay(w, t.id);
  w = { ...w, players: Object.fromEntries(Object.entries(w.players).map(([id, p]) => [id, p.teamId ? p : recoverRest(p)])) };

  // Virada do ano: aniversários, saída dos jovens de 20 anos e nova temporada da liga de base.
  if (w.date.endsWith('-01-01')) {
    add(evaluateSeason(w));
    w = ageUp(w);
    add(academyYearEnd(w));
    w = { ...w, baseLeague: newBaseSeason(year) };
    w = newTier2Season(w, year);
  }
  if (isFirstOfMonth(w.date)) {
    w = monthlyDevelopment(w);
    w = refreshAmateurs(w, rng);
    add(monthlyStaffOffers(w, rng));
    w = monthlyManagerGrowth(w);
    add(monthlyManagerOffers(w, rng));
    if (w.date.slice(5, 7) === '12') events.push(...academyAgingWarning(w));
    add(monthlyFinance(w, rng));
    w = monthlySatisfaction(w);
    add(monthlyRequests(w));
  }
  // Tier 2: copa do mês.
  w = startCup(w, rng);
  add(cupDayWithEvents(w));
  if (isMonday(w.date)) {
    w = applyRanking(w);
    w = playBaseRound(w, rng);
    add(weeklyUnemployedOffers(w, rng));
  }
  w = { ...w, sponsorOffers: w.sponsorOffers.filter((o) => o.expires >= w.date) };
  add(aiMarketDay(w, w.managerTeamId, rng));
  // Comissão técnica: cursos, renovações, fim de contrato e vagas da IA.
  w = finishCourses(w);
  w = managerDealsDay(w);
  w = expireManagerOffers(w);
  w = trackHistory(w);
  add(staffMarketDay(w));

  // Limpeza do histórico.
  w = {
    ...w,
    seriesLog: w.seriesLog.filter((x) => daysBetween(x.date, w.date) <= 70),
    results: w.results.filter((x) => daysBetween(x.date, w.date) <= 400),
    calendar: w.calendar.filter((e) => daysBetween(e.endDate, w.date) <= 400),
  };
  // Mídia: torcida, notícias e rumores do dia.
  w = mediaDay(world, w, played.results, createRng(hashString(`midia:${w.date}`)));
  return { world: w, events, results: played.results };
}
