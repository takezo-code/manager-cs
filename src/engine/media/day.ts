// Fim do dia na mídia: torcida, notícias e rumores (e, no passo seguinte, o feed do Twitter).
import type { Rng } from '../rng';
import type { MatchResult } from '../types';
import type { World } from '../world';
import { fansDay } from './fans';
import { dailyRumor, newsForDay } from './news';

export function mediaDay(prev: World, next: World, results: Record<string, MatchResult>, rng: Rng): World {
  let w = fansDay(prev, next, results);
  w = newsForDay(prev, w);
  w = dailyRumor(w, rng);
  return w;
}
