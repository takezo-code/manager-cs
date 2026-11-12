// Agenda da temporada: convites pelo ranking, aceite/recusa, qualificatória (mata-mata MD3),
// início dos eventos, um dia de cada evento ativo e o encerramento (premiação, prêmios, ranking).
import { type CalendarEvent, overlaps } from './calendar';
import { crowdBonus, lowMood } from './media/fans';
import { staffAttrsOf } from './staff/effects';
import { staffTitle } from './staff/career';
import { titleReputation } from './manager/reputation';
import { CALENDAR, DEVELOPMENT } from './config';
import { developPlayer } from './development';
import { addDays, daysBetween } from './date';
import { awardTournament, placeNumber } from './finance/prizes';
import { recoverBetweenEvents } from './form';
import { simulateMatch } from './match';
import { eventWeightOf, placeFactorOf, tierWeight } from './ranking';
import { academyLineupIds, academyTeam, academyTeamId, orgOfAcademy } from './tier2/model';
import { createRng, hashString, type Rng } from './rng';
import { validStarters } from './squad';
import { pickAwards } from './tournament/awards';
import { createTournament, playDay } from './tournament/run';
import { playerOvr } from './player';
import type { MatchResult, Team } from './types';
import type { World, WorldEvent } from './world';

type Out = { world: World; events: WorldEvent[] };

const setEvent = (w: World, ev: CalendarEvent): World => ({ ...w, calendar: w.calendar.map((e) => (e.id === ev.id ? ev : e)) });
const ranked = (w: World) => Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank);

/** Eventos que o time já tem garantidos (aceitos, classificados ou jogando). */
function commitments(w: World, teamId: string): CalendarEvent[] {
  return w.calendar.filter(
    (e) =>
      e.status !== 'encerrado' &&
      (e.accepted.includes(teamId) || e.qualified.includes(teamId) || e.tournament?.participants.includes(teamId)),
  );
}

const conflictFor = (w: World, teamId: string, ev: CalendarEvent) => commitments(w, teamId).find((e) => e.id !== ev.id && overlaps(e, ev));

const tierOf = (ev: CalendarEvent) => ev.tier ?? 1;
/** Academy jogando um evento (não é time do ranking). */
const isAcademy = (w: World, id: string) => !w.teams[id] && !!orgOfAcademy(id);
/** Dono do cadastro: a academy usa o staff, a torcida e o caixa do time. */
const ownerOf = (w: World, id: string) => (isAcademy(w, id) ? orgOfAcademy(id)! : id);
const rosterOf = (w: World, id: string) => (isAcademy(w, id) ? academyLineupIds(w, orgOfAcademy(id)!) : w.teams[id].playerIds);
/** Seed do evento: ranking; academies depois de todos os times. */
const seedRank = (w: World, id: string) => w.teams[id]?.hltvRank ?? 1000 + (w.teams[orgOfAcademy(id) ?? '']?.hltvRank ?? 0);

/**
 * Quem pode jogar o evento, na ordem de convite. Tier 1: o ranking inteiro. Tier 2/3: os times da região
 * na faixa do ranking e livres nas datas; faltando, os de ranking abaixo da faixa e, no tier 3, as academies
 * da região (no tier 2, os de cima da faixa).
 */
export function candidates(w: World, ev: CalendarEvent): string[] {
  const all = ranked(w);
  if (tierOf(ev) === 1) return all.map((t) => t.id);
  const [lo, hi] = ev.rankBand ?? [1, Infinity];
  // Rodízio: quem jogou menos tier 2/3 no ano vem primeiro (empate pelo ranking).
  const year = ev.startDate.slice(0, 4);
  const played: Record<string, number> = {};
  for (const e of w.calendar)
    if (tierOf(e) > 1 && e.id !== ev.id && e.startDate.startsWith(year))
      for (const id of e.tournament?.participants ?? e.accepted) played[id] = (played[id] ?? 0) + 1;
  const byTurn = (ts: typeof all) => [...ts].sort((a, b) => (played[a.id] ?? 0) - (played[b.id] ?? 0) || a.hltvRank - b.hltvRank);
  const region = all.filter((t) => !ev.regions || ev.regions.includes(t.region));
  const ids = [...byTurn(region.filter((t) => t.hltvRank >= lo && t.hltvRank <= hi)), ...byTurn(region.filter((t) => t.hltvRank > hi))].map((t) => t.id);
  const academies = (ts: typeof all) => ts.map((t) => academyTeamId(t.id)).filter((id) => academyLineupIds(w, orgOfAcademy(id)!).length >= 5);
  if (tierOf(ev) === 3) {
    // Manager da academy: a academy dele tem vaga garantida no tier 3 da região.
    const mine = w.manager?.academyOf;
    if (mine && region.some((t) => t.id === mine) && academyLineupIds(w, mine).length >= 5) ids.unshift(academyTeamId(mine));
    ids.push(...academies(region));
  }
  else ids.push(...region.filter((t) => t.hltvRank < lo).reverse().map((t) => t.id));
  // Último recurso para fechar a chave: times livres de outras regiões (da faixa para baixo) e, no tier 3, academies.
  const others = all.filter((t) => !region.includes(t));
  ids.push(...others.filter((t) => t.hltvRank >= lo).map((t) => t.id));
  if (tierOf(ev) === 3) ids.push(...academies(others));
  return [...new Set(ids)].filter((id) => !conflictFor(w, id, ev));
}

/**
 * Elenco temporário para o evento: time com menos de 5 joga com stand-ins (melhores agentes livres),
 * sem contrato e sem mudar o elenco de verdade.
 */
/** `used`: stand-ins já escalados hoje em outro evento (um agente livre não joga dois eventos ao mesmo tempo). */
export function withStandins(w: World, teamIds: string[], used: Set<string> = new Set()): Record<string, Team> {
  const teams = { ...w.teams };
  // Emprestados jogam pelo time do empréstimo (os 5 melhores são titulares).
  const loaned: Record<string, string[]> = {};
  for (const p of Object.values(w.players)) if (p.loan && teams[p.loan.teamId]) (loaned[p.loan.teamId] ??= []).push(p.id);
  for (const id of teamIds) {
    if (!loaned[id]) continue;
    const roster = [...teams[id].playerIds, ...loaned[id]].sort((a, b) => playerOvr(w.players[b]) - playerOvr(w.players[a]));
    teams[id] = { ...teams[id], playerIds: roster, starters: roster.slice(0, 5) };
  }
  const free = Object.values(w.players)
    .filter((p) => !p.teamId)
    .sort((a, b) => playerOvr(b) - playerOvr(a));
  for (const id of teamIds) {
    const t = teams[id];
    if (t.playerIds.length >= 5) continue;
    const extra = free.filter((p) => !used.has(p.id)).slice(0, 5 - t.playerIds.length).map((p) => p.id);
    extra.forEach((p) => used.add(p));
    const roster = [...t.playerIds, ...extra];
    teams[id] = { ...t, playerIds: roster, starters: roster.slice(0, 5) };
  }
  return teams;
}

/**
 * Convites saem 21 dias antes. Eventos de 32 times (Majors, EWC) são obrigatórios para os 32 times.
 * Nos demais, a IA decide na hora e o seu time recebe o convite na caixa de entrada.
 */
export function issueInvites(world: World): Out {
  let w = world;
  const events: WorldEvent[] = [];
  for (const ev0 of w.calendar) {
    if (ev0.status !== 'futuro' || daysBetween(w.date, ev0.startDate) > CALENDAR.inviteDaysBefore) continue;
    const invited = (tierOf(ev0) === 1 ? ranked(w).map((t) => t.id) : candidates(w, ev0)).slice(0, ev0.teams - ev0.qualifierSlots);
    let ev: CalendarEvent = { ...ev0, status: 'convites', invited };
    if (ev.teams >= CALENDAR.mandatoryTeams) {
      w = setEvent(w, { ...ev, accepted: [...invited] });
      if (invited.includes(w.managerTeamId))
        events.push({ kind: 'info', text: `${ev.name} (${ev.city}): participação confirmada (todos os times disputam).` });
      continue;
    }
    for (const teamId of invited) {
      if (isAcademy(w, teamId)) {
        ev = { ...ev, accepted: [...ev.accepted, teamId] };
        continue;
      }
      const team = w.teams[teamId];
      if (team.playerIds.length < 5) {
        ev = { ...ev, declined: [...ev.declined, teamId] };
        if (teamId === w.managerTeamId)
          events.push({ kind: 'alerta', text: `Convite para ${ev.name} recusado: seu elenco tem menos de 5 jogadores.` });
        continue;
      }
      if (teamId === w.managerTeamId) {
        w = { ...w, inbox: [...w.inbox, { id: `convite-${ev.id}`, kind: 'convite', eventId: ev.id, playerId: '', date: w.date, expires: addDays(ev.startDate, -CALENDAR.qualifierDaysBefore - 1) }] };
        events.push({ kind: 'info', text: `Convite para ${ev.name} (${ev.city}), de ${ev.startDate.slice(8)}/${ev.startDate.slice(5, 7)}.` });
        continue;
      }
      // IA: aceita se estiver livre; se já tiver outro evento nas mesmas datas, fica com o de maior premiação
      // (desde que o outro ainda não tenha começado).
      const clash = conflictFor(setEvent(w, ev), teamId, ev);
      if (!clash) ev = { ...ev, accepted: [...ev.accepted, teamId] };
      else if (clash.status === 'convites' && clash.accepted.includes(teamId) && ev.prizePool > clash.prizePool) {
        w = setEvent(w, { ...clash, accepted: clash.accepted.filter((id) => id !== teamId), declined: [...clash.declined, teamId] });
        ev = { ...ev, accepted: [...ev.accepted, teamId] };
      } else ev = { ...ev, declined: [...ev.declined, teamId] };
    }
    w = setEvent(w, ev);
  }
  return { world: w, events };
}

export function acceptInvite(w: World, eventId: string, opts: { auto?: boolean } = {}): { ok: true; world: World } | { ok: false; error: string } {
  const ev = w.calendar.find((e) => e.id === eventId);
  const me = w.managerTeamId;
  if (!ev || ev.status !== 'convites' || !ev.invited.includes(me)) return { ok: false, error: 'Esse convite não está mais disponível.' };
  if (!opts.auto && w.date >= addDays(ev.startDate, -CALENDAR.qualifierDaysBefore))
    return { ok: false, error: 'O prazo para responder acabou: as vagas restantes já foram para a qualificatória.' };
  if (w.teams[me].playerIds.length < 5) return { ok: false, error: 'Seu elenco precisa de 5 jogadores para aceitar.' };
  const clash = conflictFor(w, me, ev);
  if (clash) return { ok: false, error: `Seu time já vai jogar ${clash.name} nessas datas.` };
  const next: CalendarEvent = { ...ev, accepted: [...ev.accepted.filter((id) => id !== me), me], declined: ev.declined.filter((id) => id !== me) };
  return { ok: true, world: { ...setEvent(w, next), inbox: w.inbox.filter((i) => i.eventId !== eventId) } };
}

export function declineInvite(w: World, eventId: string): World {
  const ev = w.calendar.find((e) => e.id === eventId);
  if (!ev) return w;
  const me = w.managerTeamId;
  return { ...setEvent(w, { ...ev, declined: [...ev.declined, me], accepted: ev.accepted.filter((id) => id !== me) }), inbox: w.inbox.filter((i) => i.eventId !== eventId) };
}

/** Vence uma série MD3 de qualificatória (sem cansaço nem fase). */
function qualiMatch(w: World, a: string, b: string, seed: number): string {
  const teams = withStandins(w, [a, b]);
  const ta = teams[a];
  const tb = teams[b];
  const r = simulateMatch({
    teamA: ta,
    teamB: tb,
    playersA: validStarters(ta, w.players).map((id) => w.players[id]),
    playersB: validStarters(tb, w.players).map((id) => w.players[id]),
    format: 'MD3',
    stage: 'grupos',
    seed,
    staffA: staffAttrsOf(w, a),
    staffB: staffAttrsOf(w, b),
    fanA: { crowd: crowdBonus(w, a, 'grupos'), lowMood: lowMood(w, a) },
    fanB: { crowd: crowdBonus(w, b, 'grupos'), lowMood: lowMood(w, b) },
  });
  return r.winnerTeamId;
}

/**
 * Dia da qualificatória (3 dias antes): fecha convites sem resposta, e as vagas restantes saem de
 * mata-matas MD3 de 4 times (um por vaga) entre os próximos do ranking livres na data.
 */
export function runQualifiers(world: World): Out {
  let w = world;
  const events: WorldEvent[] = [];
  const me = w.managerTeamId;
  for (const ev0 of w.calendar) {
    if (ev0.status !== 'convites' || w.date !== addDays(ev0.startDate, -CALENDAR.qualifierDaysBefore)) continue;
    let ev = ev0;
    // Convite seu sem resposta: aceita se não houver conflito.
    if (ev.invited.includes(me) && !ev.accepted.includes(me) && !ev.declined.includes(me)) {
      const r = acceptInvite(w, ev.id, { auto: true });
      if (r.ok) {
        w = r.world;
        events.push({ kind: 'info', text: `Sem resposta: seu time foi confirmado em ${ev.name}.` });
      } else {
        w = declineInvite(w, ev.id);
        events.push({ kind: 'info', text: `Sem resposta: convite para ${ev.name} recusado (${r.error})` });
      }
      ev = w.calendar.find((e) => e.id === ev.id)!;
    }
    const slots = ev.teams - ev.accepted.length;
    const pool = candidates(w, ev).filter((id) => !ev.accepted.includes(id) && !ev.declined.includes(id) && rosterOf(w, id).length >= 5 && !conflictFor(w, id, ev));
    const qualified: string[] = [];
    if (ev.qualifierSlots === 0 || pool.length < slots * 4) {
      qualified.push(...pool.slice(0, slots)); // sem qualificatória: entram direto os próximos do ranking
    } else {
      for (let s = 0; s < slots; s++) {
        const four = pool.slice(s * 4, s * 4 + 4);
        const seed = hashString(`${ev.id}:quali:${s}`);
        const f1 = qualiMatch(w, four[0], four[3], seed);
        const f2 = qualiMatch(w, four[1], four[2], seed + 1);
        const winner = qualiMatch(w, f1, f2, seed + 2);
        qualified.push(winner);
        if (four.includes(me))
          events.push({
            kind: winner === me ? 'ok' : 'alerta',
            text: winner === me ? `Seu time se classificou para ${ev.name} pela qualificatória!` : `Seu time caiu na qualificatória de ${ev.name}.`,
          });
      }
    }
    w = setEvent(w, { ...ev, qualified });
  }
  return { world: w, events };
}

/** Começa os eventos do dia: participantes em ordem de ranking (seed). */
export function startEvents(world: World): Out {
  let w = world;
  const events: WorldEvent[] = [];
  for (const ev of w.calendar) {
    if (ev.status !== 'convites' || ev.startDate > w.date) continue;
    const ids = new Set([...ev.accepted, ...ev.qualified]);
    // Completa se faltar alguém: primeiro quem está livre e com 5 jogadores (inclusive quem recusou por
    // elenco incompleto e já se recompôs); o seu time só entra se não tiver recusado.
    const me = w.managerTeamId;
    const canFill = (id: string, strict: boolean) =>
      !ids.has(id) && !(id === me && ev.declined.includes(me)) && !conflictFor(w, id, ev) && (!strict || rosterOf(w, id).length >= 5);
    const pool = candidates(w, ev);
    for (const strict of [true, false])
      for (const id of pool) {
        if (ids.size >= ev.teams) break;
        if (canFill(id, strict)) ids.add(id);
      }
    const participants = [...ids].sort((a, b) => seedRank(w, a) - seedRank(w, b)).slice(0, ev.teams);
    // Sem times para fechar a chave (mundo pequeno, todos ocupados): o evento é cancelado.
    if (participants.length < ev.teams) {
      w = { ...setEvent(w, { ...ev, status: 'encerrado', tournament: null }), inbox: w.inbox.filter((i) => i.eventId !== ev.id) };
      if (ids.has(me)) events.push({ kind: 'alerta', text: `${ev.name} foi cancelado: não fechou ${ev.teams} times.` });
      continue;
    }
    const tournament = createTournament({ id: ev.id, name: ev.name, format: ev.format, options: ev.options, prizePool: ev.prizePool }, participants, hashString(ev.id));
    // Quem entra chega descansado (+30 de energia), e o convite sai da caixa de entrada.
    const players = { ...w.players };
    for (const id of participants) for (const pid of rosterOf(w, id)) players[pid] = recoverBetweenEvents(players[pid]);
    w = { ...setEvent(w, { ...ev, status: 'em_andamento', tournament }), players, inbox: w.inbox.filter((i) => i.eventId !== ev.id) };
    if (participants.includes(w.managerTeamId)) events.push({ kind: 'info', text: `Começou ${ev.name}, em ${ev.city}.` });
  }
  return { world: w, events };
}

/** Joga um dia de cada evento em andamento e encerra os que terminarem. */
export function playEvents(world: World, _rng?: Rng): Out & { results: Record<string, MatchResult> } {
  let w = world;
  const events: WorldEvent[] = [];
  const results: Record<string, MatchResult> = {};
  const standins = new Set<string>();
  for (const ev of w.calendar) {
    if (ev.status !== 'em_andamento' || !ev.tournament) continue;
    const teams = withStandins(w, ev.tournament.participants.filter((id) => w.teams[id]), standins);
    for (const id of ev.tournament.participants) if (isAcademy(w, id)) teams[id] = academyTeam(w, orgOfAcademy(id)!);
    const own = (id: string) => ownerOf(w, id);
    const out = playDay(ev.tournament, teams, w.players, (id) => staffAttrsOf(w, own(id)), (id, stage) => ({ crowd: crowdBonus(w, own(id), stage), lowMood: lowMood(w, own(id)) }));
    w = { ...w, players: out.players };
    // Tier 2/3: jovens (até 21) crescem a cada mapa jogado, como na liga de base.
    if (tierOf(ev) > 1) {
      const players = { ...w.players };
      for (const r of Object.values(out.results))
        for (const m of r.maps)
          for (const pid of Object.keys(m.stats))
            if (players[pid] && players[pid].age <= DEVELOPMENT.youngAge) players[pid] = developPlayer(players[pid], DEVELOPMENT.perMapYoung);
      w = { ...w, players };
    }
    for (const [id, r] of Object.entries(out.results)) {
      // Jogos de academy não entram no histórico nem nas notícias.
      if (isAcademy(w, r.teamAId) || isAcademy(w, r.teamBId)) continue;
      results[id] = r;
      const loser = r.winnerTeamId === r.teamAId ? r.teamBId : r.teamAId;
      w = { ...w, seriesLog: [...w.seriesLog, { date: w.date, winner: r.winnerTeamId, loser, winnerRoster: [...w.teams[r.winnerTeamId].starters] }] };
    }
    const t = out.tournament;
    if (!t.championId) {
      w = setEvent(w, { ...ev, tournament: t });
      continue;
    }
    // Encerramento: premiação, bônus de título, satisfação, MVP/EVPs e resultados para o ranking.
    w = setEvent(w, { ...ev, tournament: t, status: 'encerrado' });
    w = awardTournament(w, t, tierOf(ev));
    w = staffTitle(w, t.championId, createRng(hashString(`staff-titulo:${ev.id}`)));
    w = titleReputation(w, t.championId, t.format, t.participants.length, t.name);
    const weight = eventWeightOf(t.format, t.participants.length) * tierWeight(tierOf(ev));
    const res = Object.entries(t.placements).filter(([teamId]) => w.teams[teamId]).map(([teamId, label]) => ({
      eventId: ev.id,
      teamId,
      date: w.date,
      placeFactor: placeFactorOf(placeNumber(label)),
      weight,
      roster: [...w.teams[teamId].starters],
    }));
    w = { ...w, results: [...w.results, ...res] };
    const { mvp } = pickAwards(t);
    const myPlace = t.placements[w.managerTeamId];
    // Tier 2/3: só avisa quando o seu time jogou.
    if (tierOf(ev) > 1 && !myPlace) continue;
    events.push({
      kind: myPlace === 'Campeão' ? 'ok' : 'info',
      text: `${t.name}: campeão ${(w.teams[t.championId] ?? teams[t.championId]).shortName}${mvp ? `, MVP ${w.players[mvp].nick}` : ''}.${myPlace ? ` Seu time: ${myPlace}.` : ''}`,
    });
  }
  return { world: w, events, results };
}
