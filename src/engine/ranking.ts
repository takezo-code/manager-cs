// Ranking HLTV: conquistas dos últimos 12 meses (com decaimento), forma dos últimos 2 meses e
// desempenho nas últimas 10 LANs; líder com 1.000 pontos; regra do núcleo de 3 jogadores.
import { RANKING } from './config';
import { START_DATE, daysBetween } from './date';
import type { Team } from './types';
import type { World } from './world';

export interface EventResult {
  eventId: string;
  teamId: string;
  date: string;
  /** Fator da colocação (1º = 1; 2º = 0,7; …). */
  placeFactor: number;
  /** Peso do evento (Major = 1; …). */
  weight: number;
  /** Titulares no evento (regra do núcleo). */
  roster: string[];
}

export interface SeriesLogEntry {
  date: string;
  winner: string;
  loser: string;
  winnerRoster: string[];
}

/** O time ainda tem pelo menos 3 dos titulares daquele resultado? */
const sameCore = (team: Team, roster: string[]) => roster.filter((id) => team.starters.includes(id)).length >= RANKING.coreSize;

/** Peso que sobra depois de `days` dias (linear até 0 em 365). */
const decay = (days: number) => Math.max(0, 1 - days / RANKING.decayDays);

export function computeRanking(w: World): Array<{ teamId: string; points: number }> {
  const teams = Object.values(w.teams);
  const rawA: Record<string, number> = {};
  const rawF: Record<string, number> = {};
  const rawL: Record<string, number> = {};
  for (const t of teams) {
    // Conquistas + legado (pontos reais iniciais, que também decaem e seguem a regra do núcleo).
    let a = sameCore(t, t.legacyRoster ?? t.starters) ? (t.legacyPoints ?? 0) * decay(daysBetween(START_DATE, w.date)) : 0;
    const mine = w.results.filter((r) => r.teamId === t.id && sameCore(t, r.roster));
    for (const r of mine) a += 1000 * r.weight * r.placeFactor * decay(daysBetween(r.date, w.date));
    rawA[t.id] = a;
    // LANs: média do fator de colocação nas últimas 10 do tier 1 (tier 2/3 não contam).
    const last = mine.filter((r) => r.weight >= RANKING.eventWeights.small).sort((x, y) => y.date.localeCompare(x.date)).slice(0, RANKING.lanCount);
    rawL[t.id] = last.length ? last.reduce((s, r) => s + r.placeFactor, 0) / last.length : 0;
    rawF[t.id] = 0;
  }
  // Forma: vitórias em séries nos últimos 60 dias, valendo mais contra adversário bem ranqueado.
  for (const s of w.seriesLog) {
    if (daysBetween(s.date, w.date) > RANKING.formDays) continue;
    const winner = w.teams[s.winner];
    const loser = w.teams[s.loser];
    if (!winner || !loser || !sameCore(winner, s.winnerRoster)) continue;
    // Ao quadrado: vencer time fraco (comum no tier 2/3) vale pouco.
    rawF[s.winner] += ((teams.length + 1 - loser.hltvRank) / teams.length) ** 2;
  }
  const max = (o: Record<string, number>) => Math.max(0, ...Object.values(o));
  const [mA, mF, mL] = [max(rawA), max(rawF), max(rawL)];
  const norm = (v: number, m: number) => (m > 0 ? v / m : 0);
  const score = teams.map((t) => ({
    teamId: t.id,
    raw: RANKING.wAchievement * norm(rawA[t.id], mA) + RANKING.wForm * norm(rawF[t.id], mF) + RANKING.wLan * norm(rawL[t.id], mL),
  }));
  const top = Math.max(0, ...score.map((s) => s.raw));
  return score
    .map((s) => ({ teamId: s.teamId, points: top > 0 ? Math.round((s.raw / top) * 1000) : 0 }))
    .sort((a, b) => b.points - a.points || w.teams[a.teamId].hltvRank - w.teams[b.teamId].hltvRank);
}

/** Atualiza posição, pontos e histórico de todos os times (roda toda segunda-feira). */
export function applyRanking(w: World): World {
  const teams = { ...w.teams };
  computeRanking(w).forEach((r, i) => {
    const t = teams[r.teamId];
    const history = [...(t.rankHistory ?? []), { date: w.date, rank: i + 1, points: r.points }].slice(-RANKING.historySize);
    teams[r.teamId] = { ...t, hltvRank: i + 1, hltvPoints: r.points, rankHistory: history };
  });
  return { ...w, teams };
}

/** Fator de colocação e peso do evento para registrar o resultado. */
export function placeFactorOf(place: number): number {
  for (const f of RANKING.placeFactors) if (place <= f.upTo) return f.factor;
  return RANKING.placeFactors[RANKING.placeFactors.length - 1].factor;
}

export const tierWeight = (tier: 1 | 2 | 3 = 1) => RANKING.tierWeights[tier];

export function eventWeightOf(format: string, teamsInEvent: number): number {
  if (format === 'major32') return RANKING.eventWeights.major;
  if (teamsInEvent >= 32) return RANKING.eventWeights.big;
  if (teamsInEvent >= 16) return RANKING.eventWeights.mid;
  return RANKING.eventWeights.small;
}
