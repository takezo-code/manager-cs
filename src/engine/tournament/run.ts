// Monta os campeonatos (formatos em formats.ts) e avança um dia de cada vez.
import { afterSeries, recoverDay } from '../form';
import type { MatchStage } from '../types';
import type { FanContext } from '../match';
import type { StaffAttrs } from '../staff/effects';
import { simulateMatch } from '../match';
import { calcRating } from '../rating';
import { hashString } from '../rng';
import { validStarters } from '../squad';
import type { MatchResult, Player, Team, VetoStep } from '../types';
import { bracketChampion, bracketDone, nextBracketMatches } from './bracket';
import { DE_SLOTS, groupDone, groupSeries, nextGroupMatches } from './doubleElim';
import { FORMATS } from './formats';
import { gsl4Done, gsl4Series, nextGsl4Matches } from './gsl4';
import { applySwissResult, nextSwissRound, swissDone, swissEliminationPlaces } from './swiss';
import type { BracketStage, FormatId, FormatOptions, Group, Series, Stage, Tournament } from './types';

const seriesOfGroup = (g: Group) => (g.kind === 'de8' ? groupSeries(g) : gsl4Series(g));


export interface EventInfo {
  id: string;
  name: string;
  format: FormatId;
  options?: FormatOptions;
  prizePool: number;
}

/** Cria o campeonato. `participants` em ordem de seed (melhor primeiro). */
export function createTournament(info: EventInfo, participants: string[], seed: number): Tournament {
  const options = info.options ?? {};
  return {
    id: info.id,
    name: info.name,
    format: info.format,
    options,
    prizePool: info.prizePool,
    seed,
    day: 0,
    participants,
    stages: [FORMATS[info.format].first(participants, options)],
    stageIdx: 0,
    championId: null,
    placements: {},
    playerStats: {},
  };
}

export function stageDone(s: Stage): boolean {
  if (s.kind === 'swiss') return swissDone(s);
  if (s.kind === 'groups') return s.groups.every((g) => (g.kind === 'de8' ? groupDone(g) : gsl4Done(g)));
  return bracketDone(s);
}

/** Séries já criadas e ainda não jogadas na fase atual. */
export function pendingSeries(s: Stage): Series[] {
  const all: Series[] =
    s.kind === 'swiss'
      ? s.rounds.flat()
      : s.kind === 'groups'
        ? s.groups.flatMap(seriesOfGroup)
        : s.slots.map((x) => x.series).filter((m): m is Series => !!m);
  return all.filter((m) => !m.winnerId);
}

/** Todas as séries do campeonato, na ordem em que foram criadas. */
export function allSeries(t: Tournament): Series[] {
  return t.stages.flatMap((s) =>
    s.kind === 'swiss'
      ? s.rounds.flat()
      : s.kind === 'groups'
        ? s.groups.flatMap(seriesOfGroup)
        : s.slots.map((x) => x.series).filter((m): m is Series => !!m),
  );
}

/** Torneio recém-criado: sorteia os jogos do primeiro dia (para o dia de jogo do manager). */
export function prepareFirstDay(t: Tournament): Tournament {
  const s = t.stages[t.stageIdx];
  if (!pendingSeries(s).length) generateMatches(t, s);
  return t;
}

function generateMatches(t: Tournament, s: Stage): Series[] {
  const prefix = `${t.stageIdx}`;
  if (s.kind === 'swiss') return nextSwissRound(s, (i) => `${prefix}-r${s.rounds.length + 1}-${i}`);
  if (s.kind === 'groups')
    return s.groups.flatMap((g, gi) =>
      g.kind === 'de8' ? nextGroupMatches(g, (slot) => `${prefix}-g${gi}-${slot}`) : nextGsl4Matches(g, (slot) => `${prefix}-g${gi}-${slot}`),
    );
  return nextBracketMatches(s, (id) => `${prefix}-${id}`);
}

function recordPlacements(t: Tournament, s: Stage, played: Series[]) {
  if (s.kind === 'groups') {
    for (const g of s.groups) {
      if (g.kind === 'de8') {
        for (const slot of DE_SLOTS) {
          const m = g.matches[slot];
          const place = g.placeLabels[slot];
          if (m?.loserId && place && played.includes(m)) t.placements[m.loserId] = place;
        }
      } else if (g.matches.L?.loserId && played.includes(g.matches.L)) t.placements[g.matches.L.loserId] = g.eliminatedPlace;
    }
  } else if (s.kind === 'bracket') {
    for (const slot of (s as BracketStage).slots) {
      if (!slot.series?.winnerId || !played.includes(slot.series)) continue;
      if (slot.loserPlace) t.placements[slot.series.loserId!] = slot.loserPlace;
      if (slot.winnerPlace) t.placements[slot.series.winnerId] = slot.winnerPlace;
    }
  }
}

export interface DayOutcome {
  tournament: Tournament;
  players: Record<string, Player>;
  /** Resultado completo de cada série jogada no dia. */
  results: Record<string, MatchResult>;
}

/** Joga um dia: cria os jogos que já podem acontecer, simula todos e atualiza fases, cansaço e chaves. */
export function playDay(
  tournament: Tournament,
  teams: Record<string, Team>,
  players: Record<string, Player>,
  /** Comissão técnica de cada time (sem ela, partidas sem efeito de staff). */
  staffOf?: (teamId: string) => StaffAttrs,
  fanOf?: (teamId: string, stage: MatchStage) => FanContext,
  /** Veto feito pelo manager para uma série (id da série no torneio). */
  vetoOf?: (seriesId: string) => VetoStep[] | undefined,
): DayOutcome {
  if (tournament.championId) return { tournament, players, results: {} };
  const t: Tournament = structuredClone(tournament);
  let ps: Record<string, Player> = { ...players };
  const stage = t.stages[t.stageIdx];

  let todays = pendingSeries(stage);
  if (!todays.length) todays = generateMatches(t, stage);
  t.day++;

  // Recuperação diária de quem está no campeonato.
  for (const teamId of t.participants)
    for (const pid of teams[teamId].playerIds) ps[pid] = recoverDay(ps[pid]);

  const results: Record<string, MatchResult> = {};
  const snapshot = { ...ps }; // todos os jogos do dia usam o estado do início do dia
  for (const m of todays) {
    const ta = teams[m.teamAId];
    const tb = teams[m.teamBId];
    // Só os titulares jogam (e só eles gastam energia e mudam de fase).
    const startersA = validStarters(ta, snapshot);
    const startersB = validStarters(tb, snapshot);
    const r = simulateMatch({
      teamA: ta,
      teamB: tb,
      playersA: startersA.map((id) => snapshot[id]),
      playersB: startersB.map((id) => snapshot[id]),
      format: m.format,
      stage: m.stage,
      seed: hashString(`${t.seed}:${m.id}`),
      staffA: staffOf?.(m.teamAId),
      staffB: staffOf?.(m.teamBId),
      fanA: fanOf?.(m.teamAId, m.stage),
      fanB: fanOf?.(m.teamBId, m.stage),
      veto: vetoOf?.(m.id),
    });
    results[m.id] = r;
    m.day = t.day;
    m.winnerId = r.winnerTeamId;
    m.loserId = r.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
    m.score = [r.mapScore[m.teamAId], r.mapScore[m.teamBId]];
    m.maps = r.maps.map((x) => ({ map: x.map, a: x.score[m.teamAId], b: x.score[m.teamBId] }));
    if (stage.kind === 'swiss') applySwissResult(stage, m);
    for (const pid of [...startersA, ...startersB]) {
      const mapRatings = r.maps.map((x) => calcRating(x.stats[pid]));
      const st = t.playerStats[pid] ?? { maps: 0, ratingSum: 0, teamId: startersA.includes(pid) ? ta.id : tb.id };
      t.playerStats[pid] = { ...st, maps: st.maps + mapRatings.length, ratingSum: st.ratingSum + mapRatings.reduce((a, b) => a + b, 0) };
      ps[pid] = afterSeries(ps[pid], mapRatings, staffOf?.(startersA.includes(pid) ? ta.id : tb.id).MOT);
    }
  }
  recordPlacements(t, stage, todays);
  // Suíço: quem chegou a 3 derrotas já tem a colocação definida.
  if (stage.kind === 'swiss') Object.assign(t.placements, swissEliminationPlaces(stage));

  if (stageDone(stage)) {
    const next = FORMATS[t.format].next(t);
    if (next) {
      t.stages.push(next);
      t.stageIdx++;
    } else if (stage.kind === 'bracket') {
      t.championId = bracketChampion(stage);
      if (t.championId) t.placements[t.championId] = 'Campeão';
    }
  }
  // Sorteia já os jogos do próximo dia (a prévia do analista mostra o rival antes da série).
  if (!t.championId) {
    const cur = t.stages[t.stageIdx];
    if (!pendingSeries(cur).length) generateMatches(t, cur);
  }
  return { tournament: t, players: ps, results };
}
