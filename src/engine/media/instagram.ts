// Instagram do time: o manager escolhe o tipo de post; a recepção depende do momento e da Comunicação.
import { MEDIA } from '../config';
import { daysBetween } from '../date';
import { attrEffect, gainAttr } from '../manager/model';
import { getRelation } from '../market/relations';
import { playerOvr } from '../player';
import { placeFactorOf } from '../ranking';
import type { Rng } from '../rng';
import type { World } from '../world';
import { changeMood } from './fans';
import { FANS, say, type InstagramKey } from './templates';

export type PostKind = 'contratacao' | 'vitoria' | 'desculpas' | 'uniforme' | 'zoeira';

export const POST_LABEL: Record<PostKind, string> = {
  contratacao: 'Anunciar contratação',
  vitoria: 'Comemorar vitória',
  desculpas: 'Pedir desculpas',
  uniforme: 'Apresentar uniforme',
  zoeira: 'Post zoeira',
};

export interface Post {
  id: string;
  date: string;
  kind: PostKind;
  text: string;
  reception: number;
  comments: Array<{ name: string; text: string }>;
}

export interface PostContext {
  signing: { nick: string; ovr: number } | null;
  lastSeries: { won: boolean; rival: string } | null;
  lossesLast3: number;
  eliminatedRecently: boolean;
  bragRecently: boolean;
  uniformThisSeason: boolean;
  lastKind: PostKind | null;
  postedToday: boolean;
}

const recent = (w: World, date: string, days: number) => daysBetween(date, w.date) <= days;

/** O momento do seu time (o que torna cada post bom ou ruim). */
export function postContext(w: World): PostContext {
  const me = w.managerTeamId;
  const posts = w.posts ?? [];
  const signingE = w.transferLog.find((e) => e.toTeamId === me && e.kind !== 'renovacao' && recent(w, e.date, MEDIA.signingDays));
  const sp = signingE ? w.players[signingE.playerId] : null;
  const mine = w.seriesLog.filter((s) => s.winner === me || s.loser === me);
  const last = mine.at(-1);
  const champ = placeFactorOf(1);
  return {
    signing: sp ? { nick: sp.nick, ovr: playerOvr(sp) } : null,
    lastSeries: last ? { won: last.winner === me, rival: last.winner === me ? last.loser : last.winner } : null,
    lossesLast3: mine.slice(-3).filter((s) => s.loser === me).length,
    eliminatedRecently: w.results.some((r) => r.teamId === me && r.placeFactor < champ && recent(w, r.date, MEDIA.momentDays)),
    bragRecently:
      w.manager.titles.some((t) => t.teamId === me && recent(w, t.date, MEDIA.momentDays)) ||
      mine.some((s) => s.winner === me && recent(w, s.date, MEDIA.momentDays) && getRelation(w.relations, me, s.loser) <= MEDIA.classicRelation),
    uniformThisSeason: posts.some((p) => p.kind === 'uniforme' && p.date.slice(0, 4) === w.date.slice(0, 4)),
    lastKind: posts[0]?.kind ?? null,
    postedToday: posts[0]?.date === w.date,
  };
}

/** Recepção base do tipo de post no momento (sem Comunicação e sem ruído). */
export function baseReception(c: PostContext, kind: PostKind): number {
  let r = 0;
  switch (kind) {
    case 'contratacao':
      r = c.signing ? (c.signing.ovr >= MEDIA.starOvr ? 6 : 2) : -2;
      break;
    case 'vitoria':
      r = !c.lastSeries ? 0 : c.lastSeries.won ? 3 : -4;
      break;
    case 'desculpas':
      r = c.lossesLast3 >= 2 ? 4 : c.lossesLast3 === 0 ? -1 : 0;
      break;
    case 'uniforme':
      r = c.uniformThisSeason ? 0 : 2;
      break;
    case 'zoeira':
      r = c.eliminatedRecently ? -8 : c.bragRecently ? 3 : 0;
      break;
  }
  return c.lastKind === kind ? r / 2 : r;
}

const CAPTION: Record<PostKind, InstagramKey> = {
  contratacao: 'post_contratacao',
  vitoria: 'post_vitoria',
  desculpas: 'post_desculpas',
  uniforme: 'post_uniforme',
  zoeira: 'post_zoeira',
};

export function makePost(world: World, kind: PostKind, rng: Rng): { ok: true; world: World } | { ok: false; error: string } {
  const me = world.managerTeamId;
  if (!me) return { ok: false, error: 'Sem time, não há Instagram do clube para postar.' };
  const c = postContext(world);
  if (c.postedToday) return { ok: false, error: 'Você já postou hoje. Volte amanhã.' };
  const team = world.teams[me];
  const name = (id: string) => world.teams[id]?.name ?? id;
  const seed = `${world.date}:${kind}`;
  const text =
    kind === 'contratacao' && !c.signing
      ? say('instagram', 'post_contratacao_vazio', { time: team.name }, seed)
      : say('instagram', CAPTION[kind], { time: team.name, jogador: c.signing?.nick ?? '', rival: c.lastSeries ? name(c.lastSeries.rival) : 'o adversário' }, seed);
  const reception =
    Math.round((baseReception(c, kind) + MEDIA.communicationPost * attrEffect(world.manager, 'COM') + (rng.next() - 0.5) * 2 * MEDIA.postNoise) * 10) / 10;
  const band = reception >= MEDIA.goodPost ? 'comentario_positivo' : reception <= -MEDIA.goodPost ? 'comentario_negativo' : 'comentario_neutro';
  const comments = Array.from({ length: rng.int(6, 10) }, (_, i) => ({
    name: rng.pick(FANS).handle,
    text: say('instagram', rng.chance(0.7) ? band : 'comentario_neutro', { time: team.name }, `${seed}:c${i}:${rng.next()}`),
  }));
  const post: Post = { id: `${world.date}:${kind}`, date: world.date, kind, text, reception, comments };
  let w: World = { ...world, posts: [post, ...(world.posts ?? [])].slice(0, MEDIA.maxPosts) };
  w = changeMood(w, me, reception);
  if (reception >= MEDIA.goodPost) w = { ...w, manager: gainAttr(w.manager, 'COM', MEDIA.communicationGrowth) };
  return { ok: true, world: w };
}

/** Dica do momento para a tela (o que tende a funcionar hoje). */
export function bestPostToday(w: World): PostKind | null {
  const c = postContext(w);
  const kinds: PostKind[] = ['contratacao', 'vitoria', 'desculpas', 'uniforme', 'zoeira'];
  const best = kinds.map((k) => ({ k, r: baseReception(c, k) })).sort((a, b) => b.r - a.r)[0];
  return best.r > 0 ? best.k : null;
}

