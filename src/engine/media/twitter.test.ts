import { describe, expect, it } from 'vitest';
import { changeRelation } from '../market/relations';
import { createRng } from '../rng';
import { createWorld } from '../season';
import type { MatchResult } from '../types';
import type { World } from '../world';
import { mediaDay } from './day';
import { pushTweets, tweetsForDay } from './twitter';

const series = (winner: string, loser: string): MatchResult =>
  ({ teamAId: winner, teamBId: loser, winnerTeamId: winner, stage: 'grupos', format: 'MD3', seed: 1, veto: [], maps: [], mapScore: {}, ratings: {} }) as MatchResult;

describe('Twitter', () => {
  const w0 = createWorld('furia');
  const rng = () => createRng(3);

  it('série do seu time: torcedores reagem à vitória ou à derrota', () => {
    const win = tweetsForDay(w0, w0, { a: series('furia', 'mouz') }, rng());
    expect(win.some((t) => t.author.kind === 'torcedor')).toBe(true);
    expect(tweetsForDay(w0, w0, { a: series('g2', 'mouz') }, rng()).filter((t) => t.author.kind === 'torcedor')).toHaveLength(0);
  });

  it('clássico (relação ≤ −30): um pro real do vencedor provoca', () => {
    const w = { ...w0, relations: changeRelation(w0.relations, 'furia', 'mibr', -60) };
    const out = tweetsForDay(w, w, { a: series('furia', 'mibr') }, rng());
    const pro = out.find((t) => t.author.kind === 'pro')!;
    expect(pro).toBeTruthy();
    expect(w.teams.furia.playerIds.map((id) => w.players[id].nick)).toContain(pro.author.name);
  });

  it('título: conta de notícias e torcida do campeão', () => {
    const ev = w0.calendar.find((e) => e.tier === 1)!;
    const prev = { ...w0, calendar: [{ ...ev, status: 'em_andamento' as const }] };
    const next = { ...w0, calendar: [{ ...ev, status: 'encerrado' as const, tournament: { ...(ev.tournament ?? ({} as never)), championId: 'furia' } }] };
    const out = tweetsForDay(prev, next, {}, rng());
    expect(out.some((t) => t.author.kind === 'noticias')).toBe(true);
    expect(out.some((t) => t.author.kind === 'torcedor')).toBe(true);
  });

  it('torcida na bronca critica jogador seu em má fase pelo nick', () => {
    const p = w0.teams.furia.playerIds[0];
    const next = { ...w0, fans: { ...w0.fans, furia: 10 }, players: { ...w0.players, [p]: { ...w0.players[p], phase: 'ma_fase' as const } } };
    const out = tweetsForDay(w0, next, {}, rng());
    expect(out.some((t) => t.text.includes(w0.players[p].nick))).toBe(true);
  });

  it('manager que sai: gratidão (com título) ou raiva (sem)', () => {
    const left = (titles: number): World => ({
      ...w0,
      managerTeamId: '',
      manager: { ...w0.manager, titles: Array.from({ length: titles }, () => ({ event: 'X', date: w0.date, teamId: 'furia' })), stints: [{ ...w0.manager.stints[0], to: w0.date, reason: 'demitido' }] },
    });
    const thanks = tweetsForDay(w0, left(1), {}, rng()).map((t) => t.text).join(' ');
    const weak = { ...w0, manager: { ...w0.manager, confidence: 30 } };
    const angry = tweetsForDay(weak, left(0), {}, rng()).map((t) => t.text).join(' ');
    expect(thanks).not.toBe(angry);
    expect(tweetsForDay(w0, left(0), {}, rng()).length).toBeGreaterThan(0);
  });

  it('feed guarda no máximo 150 tuítes e entra no mediaDay', () => {
    let w = w0;
    for (let i = 0; i < 20; i++) w = pushTweets(w, tweetsForDay(w0, w0, { a: series('furia', 'mouz') }, createRng(i)));
    expect(w.feed.length).toBeLessThanOrEqual(150);
    expect(mediaDay(w0, w0, { a: series('furia', 'mouz') }, rng()).feed.length).toBeGreaterThan(0);
  });
});
