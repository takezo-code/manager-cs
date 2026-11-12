// Fim do dia na mídia: torcida, notícias e rumores (e, no passo seguinte, o feed do Twitter).
import { createRng, hashString, type Rng } from '../rng';
import type { MatchResult } from '../types';
import type { World } from '../world';
import { fansDay } from './fans';
import { dailyRumor, newsForDay } from './news';
import { pushTweets, tweetsForDay } from './twitter';

/**
 * Compara o mundo antes e depois (de um dia ou de uma ação do manager) e gera torcida, notícias e tuítes.
 * Rumores só no fim do dia.
 */
export function mediaDay(prev: World, next: World, results: Record<string, MatchResult>, rng: Rng, opts: { rumor?: boolean } = {}): World {
  let w = fansDay(prev, next, results);
  w = newsForDay(prev, w);
  if (opts.rumor !== false) w = dailyRumor(w, rng);
  w = pushTweets(w, tweetsForDay(prev, w, results, rng));
  return w;
}

/** Depois de uma ação do manager (contratar, aceitar proposta, pedir demissão…): mídia do que mudou, sem rumores. */
export const mediaAfterAction = (prev: World, next: World): World =>
  mediaDay(prev, next, {}, createRng(hashString(`acao:${next.date}:${next.transferLog.length}:${next.managerTeamId}`)), { rumor: false });
