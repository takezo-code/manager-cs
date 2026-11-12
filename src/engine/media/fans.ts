// Humor da torcida (0 a 100, oculto): sobe e desce com o que acontece e pesa no patrocínio, na pressão e nos jogos com público.
import { MEDIA } from '../config';
import { attrEffect } from '../manager/model';
import { playerOvr } from '../player';
import type { MatchResult, MatchStage, Player } from '../types';
import type { World } from '../world';

export const fanMood = (w: World, teamId: string) => w.fans?.[teamId] ?? MEDIA.startMood;

/** Muda o humor; no time do manager, a Comunicação reduz as perdas (até 30%). */
export function changeMood(w: World, teamId: string, delta: number): World {
  if (!delta || !w.teams[teamId]) return w;
  let d = delta;
  if (d < 0 && teamId === w.managerTeamId && w.manager) d *= 1 - MEDIA.communicationShield * attrEffect(w.manager, 'COM');
  const v = Math.max(0, Math.min(100, fanMood(w, teamId) + d));
  return { ...w, fans: { ...w.fans, [teamId]: v } };
}

/** Ídolo: o titular de maior OVR ou quem já foi MVP. */
export function isIdol(w: World, teamId: string, p: Player): boolean {
  const team = w.teams[teamId];
  if (!team?.starters.includes(p.id) && !team?.playerIds.includes(p.id)) return false;
  if (p.awards?.some((a) => a.kind === 'MVP')) return true;
  const best = [...team.starters].sort((a, b) => playerOvr(w.players[b]) - playerOvr(w.players[a]))[0];
  return best === p.id;
}

/** O que mexeu com as torcidas hoje: séries, títulos, ranking, contratações, vendas e atrasos. */
export function fansDay(prev: World, next: World, results: Record<string, MatchResult>): World {
  let w = next;
  for (const r of Object.values(results)) {
    const mult = r.stage === 'playoffs' || r.stage === 'final' ? 2 : 1;
    const loser = r.winnerTeamId === r.teamAId ? r.teamBId : r.teamAId;
    w = changeMood(w, r.winnerTeamId, MEDIA.seriesMood * mult);
    w = changeMood(w, loser, -MEDIA.seriesMood * mult);
  }
  const wasOpen = new Set(prev.calendar.filter((e) => e.status !== 'encerrado').map((e) => e.id));
  for (const ev of next.calendar)
    if (ev.status === 'encerrado' && wasOpen.has(ev.id) && ev.tournament?.championId) w = changeMood(w, ev.tournament.championId, MEDIA.titleMood);
  for (const t of Object.values(next.teams)) {
    const before = prev.teams[t.id];
    if (!before) continue;
    if (before.hltvRank !== t.hltvRank) w = changeMood(w, t.id, (before.hltvRank - t.hltvRank) * MEDIA.rankMood);
    if (t.lateMonths > before.lateMonths) w = changeMood(w, t.id, -MEDIA.lateMood);
  }
  for (const e of next.transferLog.filter((x) => x.date === next.date)) {
    const p = prev.players[e.playerId] ?? next.players[e.playerId];
    if (!p) continue;
    if (e.toTeamId && e.kind !== 'renovacao' && playerOvr(p) >= MEDIA.starOvr) w = changeMood(w, e.toTeamId, MEDIA.starSigningMood);
    if (e.fromTeamId && e.fee > 0 && isIdol(prev, e.fromTeamId, p)) w = changeMood(w, e.fromTeamId, -MEDIA.idolSaleMood);
  }
  return w;
}

/** Patrocínio do seu time conforme a torcida. */
export function fanSponsorFactor(w: World): number {
  if (!w.managerTeamId) return 1;
  const m = fanMood(w, w.managerTeamId);
  return m < MEDIA.lowMood ? 1 - MEDIA.lowSponsor : m > MEDIA.highMood ? 1 + MEDIA.highSponsor : 1;
}

/** Jogos com público (playoffs e final): torcida empolgada dá até +1,5 nos duelos. */
export function crowdBonus(w: World, teamId: string, stage: MatchStage): number {
  if (stage === 'grupos') return 0;
  const m = fanMood(w, teamId);
  return m > MEDIA.highMood ? Math.min(MEDIA.crowdMax, (m - MEDIA.highMood) * MEDIA.crowdPerPoint) : 0;
}

/** Torcida na bronca: a pressão de playoff vale também nos grupos. */
export const lowMood = (w: World, teamId: string) => fanMood(w, teamId) < MEDIA.lowMood;

export function moodLabel(mood: number): string {
  if (mood < 20) return 'Torcida revoltada';
  if (mood < 35) return 'Torcida na bronca';
  if (mood < 50) return 'Torcida desconfiada';
  if (mood < 65) return 'Torcida tranquila';
  if (mood < 80) return 'Torcida animada';
  return 'Torcida empolgada';
}
