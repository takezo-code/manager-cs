// Monta os campeonatos (Major e IEM) e avança um dia de cada vez.
import { afterSeries, recoverDay } from '../form';
import { simulateMatch } from '../match';
import { calcRating } from '../rating';
import { hashString } from '../rng';
import { validStarters } from '../squad';
import type { MatchResult, Player, Team } from '../types';
import { bracketChampion, bracketDone, createBracket, nextBracketMatches } from './bracket';
import { DE_SLOTS, createGroup, groupDone, groupEliminationPlace, groupQualified, nextGroupMatches } from './doubleElim';
import {
  applySwissResult,
  createSwiss,
  nextSwissRound,
  swissAdvanced,
  swissDone,
  swissEliminationPlaces,
} from './swiss';
import type { BracketSlot, BracketStage, Series, Stage, Tournament, TournamentTemplate } from './types';

export const TEMPLATES: Record<TournamentTemplate, { name: string; teams: number; description: string }> = {
  major: {
    name: 'PGL Major Singapura 2026',
    teams: 32,
    description:
      '32 times em 3 fases suíças (3 vitórias classificam, 3 derrotas eliminam) e playoffs com 8. Stages 1 e 2: MD1, com MD3 nos jogos que classificam ou eliminam. Stage 3: tudo MD3. Playoffs MD3 e final MD5.',
  },
  iem: {
    name: 'IEM Beijing 2026',
    teams: 16,
    description:
      '16 times em 2 grupos de dupla eliminação (MD3). O 1º de cada grupo vai direto à semifinal; 2º e 3º jogam as quartas. Playoffs MD3 e final MD5.',
  },
};

export function createTournament(template: TournamentTemplate, teams: Team[], seed: number): Tournament {
  const ranked = [...teams].sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);
  const info = TEMPLATES[template];
  const participants = ranked.slice(0, info.teams);
  let first: Stage;
  if (template === 'major') {
    // Stage 1: 17º ao 32º do ranking. Os demais entram nas fases seguintes.
    first = createSwiss('Stage 1', participants.slice(16, 32), false, 25);
  } else {
    // Distribuição em serpentina: A = 1, 4, 5, 8, 9, 12, 13, 16; B = 2, 3, 6, 7, 10, 11, 14, 15.
    const a: string[] = [];
    const b: string[] = [];
    participants.forEach((id, i) => ([0, 3].includes(i % 4) ? a : b).push(id));
    first = { kind: 'groups', name: 'Fase de grupos', groups: [createGroup('Grupo A', a), createGroup('Grupo B', b)] };
  }
  return {
    id: `${template}-${seed}`,
    name: info.name,
    template,
    seed,
    day: 0,
    participants,
    stages: [first],
    stageIdx: 0,
    championId: null,
    placements: {},
  };
}

const playoffSlot = (
  id: string,
  label: string,
  a: BracketSlot['a'],
  b: BracketSlot['b'],
  loserPlace: string,
  final = false,
): BracketSlot => ({ id, label, a, b, loserPlace, format: final ? 'MD5' : 'MD3', stage: final ? 'final' : 'playoffs' });

function buildNextStage(t: Tournament): Stage | null {
  const cur = t.stages[t.stageIdx];
  if (t.template === 'major' && cur.kind === 'swiss') {
    const adv = swissAdvanced(cur);
    if (t.stageIdx === 0) return createSwiss('Stage 2', [...t.participants.slice(8, 16), ...adv], false, 17);
    if (t.stageIdx === 1) return createSwiss('Stage 3', [...t.participants.slice(0, 8), ...adv], true, 9);
    const s = (i: number) => ({ team: adv[i] });
    return createBracket('Playoffs', [
      playoffSlot('QF1', 'Quartas de final', s(0), s(7), '5º–8º'),
      playoffSlot('QF2', 'Quartas de final', s(3), s(4), '5º–8º'),
      playoffSlot('QF3', 'Quartas de final', s(1), s(6), '5º–8º'),
      playoffSlot('QF4', 'Quartas de final', s(2), s(5), '5º–8º'),
      playoffSlot('SF1', 'Semifinal', { winnerOf: 'QF1' }, { winnerOf: 'QF2' }, '3º–4º'),
      playoffSlot('SF2', 'Semifinal', { winnerOf: 'QF3' }, { winnerOf: 'QF4' }, '3º–4º'),
      playoffSlot('F', 'Grande final', { winnerOf: 'SF1' }, { winnerOf: 'SF2' }, 'Vice', true),
    ]);
  }
  if (t.template === 'iem' && cur.kind === 'groups') {
    const [a1, a2, a3] = groupQualified(cur.groups[0])!;
    const [b1, b2, b3] = groupQualified(cur.groups[1])!;
    return createBracket('Playoffs', [
      playoffSlot('QF1', 'Quartas de final', { team: a2 }, { team: b3 }, '5º–6º'),
      playoffSlot('QF2', 'Quartas de final', { team: b2 }, { team: a3 }, '5º–6º'),
      playoffSlot('SF1', 'Semifinal', { team: a1 }, { winnerOf: 'QF2' }, '3º–4º'),
      playoffSlot('SF2', 'Semifinal', { team: b1 }, { winnerOf: 'QF1' }, '3º–4º'),
      playoffSlot('F', 'Grande final', { winnerOf: 'SF1' }, { winnerOf: 'SF2' }, 'Vice', true),
    ]);
  }
  return null;
}

export function stageDone(s: Stage): boolean {
  if (s.kind === 'swiss') return swissDone(s);
  if (s.kind === 'groups') return s.groups.every(groupDone);
  return bracketDone(s);
}

/** Séries já criadas e ainda não jogadas na fase atual. */
export function pendingSeries(s: Stage): Series[] {
  const all: Series[] =
    s.kind === 'swiss'
      ? s.rounds.flat()
      : s.kind === 'groups'
        ? s.groups.flatMap((g) => DE_SLOTS.map((k) => g.matches[k]).filter((m): m is Series => !!m))
        : s.slots.map((x) => x.series).filter((m): m is Series => !!m);
  return all.filter((m) => !m.winnerId);
}

/** Todas as séries do campeonato, na ordem em que foram criadas. */
export function allSeries(t: Tournament): Series[] {
  return t.stages.flatMap((s) =>
    s.kind === 'swiss'
      ? s.rounds.flat()
      : s.kind === 'groups'
        ? s.groups.flatMap((g) => DE_SLOTS.map((k) => g.matches[k]).filter((m): m is Series => !!m))
        : s.slots.map((x) => x.series).filter((m): m is Series => !!m),
  );
}

function generateMatches(t: Tournament, s: Stage): Series[] {
  const prefix = `${t.stageIdx}`;
  if (s.kind === 'swiss') return nextSwissRound(s, (i) => `${prefix}-r${s.rounds.length + 1}-${i}`);
  if (s.kind === 'groups') return s.groups.flatMap((g, gi) => nextGroupMatches(g, (slot) => `${prefix}-g${gi}-${slot}`));
  return nextBracketMatches(s, (id) => `${prefix}-${id}`);
}

function recordPlacements(t: Tournament, s: Stage, played: Series[]) {
  if (s.kind === 'groups') {
    for (const g of s.groups)
      for (const slot of DE_SLOTS) {
        const m = g.matches[slot];
        const place = groupEliminationPlace(slot);
        if (m?.loserId && place && played.includes(m)) t.placements[m.loserId] = place;
      }
  } else if (s.kind === 'bracket') {
    for (const slot of (s as BracketStage).slots)
      if (slot.series?.loserId && played.includes(slot.series)) t.placements[slot.series.loserId] = slot.loserPlace;
  }
}

export interface DayOutcome {
  tournament: Tournament;
  players: Record<string, Player>;
  /** Resultado completo de cada série jogada no dia. */
  results: Record<string, MatchResult>;
}

/** Joga um dia: cria os jogos que já podem acontecer, simula todos e atualiza fases, cansaço e chaves. */
export function playDay(tournament: Tournament, teams: Record<string, Team>, players: Record<string, Player>): DayOutcome {
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
  const snapshot = ps; // todos os jogos do dia usam o estado do início do dia
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
      ps = { ...ps, [pid]: afterSeries(ps[pid], mapRatings) };
    }
  }
  recordPlacements(t, stage, todays);
  // Suíço: quem chegou a 3 derrotas já tem a colocação definida.
  if (stage.kind === 'swiss') Object.assign(t.placements, swissEliminationPlaces(stage));

  if (stageDone(stage)) {
    const next = buildNextStage(t);
    if (next) {
      t.stages.push(next);
      t.stageIdx++;
    } else if (stage.kind === 'bracket') {
      t.championId = bracketChampion(stage);
      if (t.championId) t.placements[t.championId] = 'Campeão';
    }
  }
  return { tournament: t, players: ps, results };
}
