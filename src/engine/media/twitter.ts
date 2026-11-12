// Feed do Twitter: torcedores, jornalistas e a conta de notícias (fictícios) e os pros do jogo (nick real).
import { MEDIA } from '../config';
import { getRelation } from '../market/relations';
import type { Rng } from '../rng';
import type { MatchResult } from '../types';
import type { World } from '../world';
import { fanMood, isIdol, newTransfers } from './fans';
import { FANS, JOURNALISTS, NEWS_ACCOUNT, say, type Account, type TemplateVar, type TweetKind } from './templates';

export interface Tweet {
  id: string;
  date: string;
  author: Account & { kind: 'torcedor' | 'jornalista' | 'noticias' | 'pro' };
  text: string;
  likes: number;
}

export const pushTweets = (w: World, tweets: Tweet[]): World =>
  tweets.length ? { ...w, feed: [...tweets, ...(w.feed ?? [])].slice(0, MEDIA.maxTweets) } : w;

/** Tuítes do dia, a partir do que mudou entre ontem e hoje. */
export function tweetsForDay(prev: World, next: World, results: Record<string, MatchResult>, rng: Rng): Tweet[] {
  const out: Tweet[] = [];
  const today = next.date;
  const name = (id: string | null | undefined) => (id ? (next.teams[id]?.name ?? id) : '');
  const add = (kind: Tweet['author']['kind'], author: Account, tweet: TweetKind, vars: Partial<Record<TemplateVar, string>>) => {
    const seed = `${today}:${out.length}:${rng.next()}`;
    const reach = kind === 'pro' || kind === 'noticias' ? 20 : 1;
    out.push({ id: `${today}:tw${out.length}`, date: today, author: { ...author, kind }, text: say('tweets', tweet, vars, seed), likes: Math.round(rng.int(5, 400) * reach) });
  };
  const fan = () => rng.pick(FANS);
  const pro = (teamId: string): Account | null => {
    const ids = next.teams[teamId]?.starters ?? [];
    if (!ids.length) return null;
    const p = next.players[rng.pick(ids)];
    return p ? { name: p.nick, handle: `@${p.nick.toLowerCase().replace(/[^a-z0-9_]/g, '')}` } : null;
  };
  const me = next.managerTeamId;

  // Séries: torcida do seu time reage; clássicos rendem provocação de um pro do vencedor.
  for (const r of Object.values(results)) {
    const loser = r.winnerTeamId === r.teamAId ? r.teamBId : r.teamAId;
    if (me && (r.teamAId === me || r.teamBId === me)) {
      const won = r.winnerTeamId === me;
      const other = won ? loser : r.winnerTeamId;
      const mood = fanMood(next, me);
      const n = mood < 35 || mood > 70 ? 3 : 2;
      for (let i = 0; i < n; i++) add('torcedor', fan(), won ? 'fan_vitoria' : 'fan_derrota', { time: name(me), rival: name(other) });
    }
    if (getRelation(next.relations, r.teamAId, r.teamBId) <= MEDIA.classicRelation) {
      const p = pro(r.winnerTeamId);
      if (p) add('pro', p, 'pro_provocacao', { time: name(r.winnerTeamId), rival: name(loser) });
    }
  }

  // Títulos: conta de notícias, pro do campeão e (se for o seu) a torcida.
  const wasOpen = new Set(prev.calendar.filter((e) => e.status !== 'encerrado').map((e) => e.id));
  for (const ev of next.calendar) {
    const champ = ev.tournament?.championId;
    if (ev.status !== 'encerrado' || !wasOpen.has(ev.id) || !champ) continue;
    add('noticias', NEWS_ACCOUNT, 'noticias_titulo', { time: name(champ), evento: ev.name });
    const p = pro(champ);
    if (p) add('pro', p, 'pro_comemoracao', { time: name(champ), evento: ev.name });
    if (champ === me) for (let i = 0; i < 3; i++) add('torcedor', fan(), 'fan_titulo', { time: name(me), evento: ev.name });
  }

  // Seu time: contratações, venda do ídolo e críticas com a torcida na bronca.
  if (me) {
    for (const e of newTransfers(prev, next)) {
      const p = prev.players[e.playerId] ?? next.players[e.playerId];
      if (!p) continue;
      if (e.toTeamId === me && e.kind !== 'renovacao') add('torcedor', fan(), 'fan_contratacao', { jogador: p.nick, time: name(me) });
      if (e.fromTeamId === me && e.fee > 0 && isIdol(prev, me, p)) for (let i = 0; i < 2; i++) add('torcedor', fan(), 'fan_venda_idolo', { jogador: p.nick, time: name(me) });
    }
    if (fanMood(next, me) < MEDIA.lowMood)
      for (const id of next.teams[me].playerIds) {
        const p = next.players[id];
        const became = p?.phase === 'ma_fase' && prev.players[id]?.phase !== 'ma_fase';
        if (p?.phase === 'ma_fase' && (became || rng.chance(MEDIA.critiqueChance))) add('torcedor', fan(), 'fan_critica', { jogador: p.nick, time: name(me) });
      }
  }

  // Rumores de hoje: um jornalista repercute.
  for (const n of (next.news ?? []).filter((x) => x.date === today && x.rumor)) {
    const target = n.teamIds[0];
    const nick = n.playerId ? next.players[n.playerId]?.nick : undefined;
    if (nick && target) add('jornalista', rng.pick(JOURNALISTS), 'jornalista_rumor', { jogador: nick, time: name(target) });
  }

  // Manager que saiu: a torcida do time antigo reage (gratidão com título ou boa confiança; raiva sem).
  if (prev.managerTeamId && prev.managerTeamId !== next.managerTeamId) {
    const old = prev.managerTeamId;
    const happy = next.manager.titles.some((t) => t.teamId === old) || prev.manager.confidence >= MEDIA.gratitudeConfidence;
    for (let i = 0; i < 2; i++) add('torcedor', fan(), happy ? 'fan_manager_gratidao' : 'fan_manager_raiva', { manager: next.manager.name, time: name(old) });
  }
  return out;
}
