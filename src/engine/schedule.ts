// Agenda da temporada: convites pelo ranking, aceite/recusa, qualificatória (mata-mata MD3),
// início dos eventos, um dia de cada evento ativo e o encerramento (premiação, prêmios, ranking).
import { type CalendarEvent, overlaps } from './calendar';
import { CALENDAR } from './config';
import { addDays, daysBetween } from './date';
import { awardTournament, placeNumber } from './finance/prizes';
import { simulateMatch } from './match';
import { eventWeightOf, placeFactorOf } from './ranking';
import { hashString, type Rng } from './rng';
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

/**
 * Elenco temporário para o evento: time com menos de 5 joga com stand-ins (melhores agentes livres),
 * sem contrato e sem mudar o elenco de verdade.
 */
export function withStandins(w: World, teamIds: string[]): Record<string, Team> {
  const teams = { ...w.teams };
  const used = new Set<string>();
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
    const invited = ranked(w).slice(0, ev0.teams - ev0.qualifierSlots).map((t) => t.id);
    let ev: CalendarEvent = { ...ev0, status: 'convites', invited };
    if (ev.teams >= Object.keys(w.teams).length) {
      w = setEvent(w, { ...ev, accepted: [...invited] });
      if (invited.includes(w.managerTeamId))
        events.push({ kind: 'info', text: `${ev.name} (${ev.city}): participação confirmada (todos os times disputam).` });
      continue;
    }
    for (const teamId of invited) {
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
      // IA: aceita se não tiver outro evento no mesmo período.
      ev = conflictFor(setEvent(w, ev), teamId, ev) ? { ...ev, declined: [...ev.declined, teamId] } : { ...ev, accepted: [...ev.accepted, teamId] };
    }
    w = setEvent(w, ev);
  }
  return { world: w, events };
}

export function acceptInvite(w: World, eventId: string): { ok: true; world: World } | { ok: false; error: string } {
  const ev = w.calendar.find((e) => e.id === eventId);
  const me = w.managerTeamId;
  if (!ev || ev.status !== 'convites' || !ev.invited.includes(me)) return { ok: false, error: 'Esse convite não está mais disponível.' };
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
      const r = acceptInvite(w, ev.id);
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
    const pool = ranked(w)
      .map((t) => t.id)
      .filter((id) => !ev.accepted.includes(id) && !ev.declined.includes(id) && w.teams[id].playerIds.length >= 5 && !conflictFor(w, id, ev));
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
      !ids.has(id) && !(id === me && ev.declined.includes(me)) && !conflictFor(w, id, ev) && (!strict || w.teams[id].playerIds.length >= 5);
    for (const strict of [true, false])
      for (const t of ranked(w)) {
        if (ids.size >= ev.teams) break;
        if (canFill(t.id, strict)) ids.add(t.id);
      }
    const participants = ranked(w).map((t) => t.id).filter((id) => ids.has(id)).slice(0, ev.teams);
    const tournament = createTournament({ id: ev.id, name: ev.name, format: ev.format, options: ev.options, prizePool: ev.prizePool }, participants, hashString(ev.id));
    w = setEvent(w, { ...ev, status: 'em_andamento', tournament });
    if (participants.includes(w.managerTeamId)) events.push({ kind: 'info', text: `Começou ${ev.name}, em ${ev.city}.` });
  }
  return { world: w, events };
}

/** Joga um dia de cada evento em andamento e encerra os que terminarem. */
export function playEvents(world: World, _rng?: Rng): Out & { results: Record<string, MatchResult> } {
  let w = world;
  const events: WorldEvent[] = [];
  const results: Record<string, MatchResult> = {};
  for (const ev of w.calendar) {
    if (ev.status !== 'em_andamento' || !ev.tournament) continue;
    const out = playDay(ev.tournament, withStandins(w, ev.tournament.participants), w.players);
    w = { ...w, players: out.players };
    for (const [id, r] of Object.entries(out.results)) {
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
    w = awardTournament(w, t);
    const weight = eventWeightOf(t.format, t.participants.length);
    const res = Object.entries(t.placements).map(([teamId, label]) => ({
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
    events.push({
      kind: myPlace === 'Campeão' ? 'ok' : 'info',
      text: `${t.name}: campeão ${w.teams[t.championId].shortName}${mvp ? `, MVP ${w.players[mvp].nick}` : ''}.${myPlace ? ` Seu time: ${myPlace}.` : ''}`,
    });
  }
  return { world: w, events, results };
}
