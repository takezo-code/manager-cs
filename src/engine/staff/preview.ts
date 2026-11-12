// Prévia do analista: mapas fortes e fracos do próximo rival. Leitura baixa erra (troca mapas).
import { STAFF } from '../config';
import { hashString } from '../rng';
import { pendingSeries } from '../tournament/run';
import { MAP_IDS, type MapId } from '../types';
import type { World } from '../world';
import { staffAttr } from './model';
import { withAcademyTeams } from '../tier2/model';

export interface RivalPreview {
  strong: MapId[];
  weak: MapId[];
}

const frac = (key: string) => (hashString(key) % 10_000) / 10_000;

/**
 * Estável por rival e série (`key`; sem ela, a data). Leitura ≥ 85: exata; abaixo, cada mapa tem
 * (85 − Leitura)% de chance de estar errado.
 */
export function rivalPreview(w: World, rivalId: string, key: string = w.date): RivalPreview {
  const t = withAcademyTeams(w, [rivalId])[rivalId];
  const sorted = [...MAP_IDS].sort((a, b) => t.mapStrength[b] - t.mapStrength[a]);
  const strong = sorted.slice(0, 2);
  const weak = sorted.slice(-2).reverse();
  const wrongChance = Math.max(0, STAFF.previewExactFrom - staffAttr(w, w.managerTeamId, 'LEI')) / 100;
  const listed = [...strong, ...weak];
  const out = listed.map((m, i) => {
    const k = `${rivalId}:${key}:${i}`;
    if (frac(`${k}:erro`) >= wrongChance) return m;
    const others = MAP_IDS.filter((x) => !listed.includes(x));
    return others[Math.floor(frac(`${k}:troca`) * others.length)] ?? m;
  });
  // Sem mapa repetido depois das trocas.
  const seen = new Set<MapId>();
  const fixed = out.map((m, i) => (seen.has(m) ? listed[i] : (seen.add(m), m)));
  return { strong: fixed.slice(0, 2), weak: fixed.slice(2) };
}

/** Rival e série do próximo jogo do seu time num evento em andamento (se a série já foi sorteada). */
export function nextOpponent(w: World): { rivalId: string; seriesId: string } | null {
  const me = w.managerTeamId;
  for (const ev of w.calendar) {
    const t = ev.tournament;
    if (ev.status !== 'em_andamento' || !t || t.championId) continue;
    const s = pendingSeries(t.stages[t.stageIdx]).find((x) => x.teamAId === me || x.teamBId === me);
    if (s) return { rivalId: s.teamAId === me ? s.teamBId : s.teamAId, seriesId: `${ev.id}:${s.id}` };
  }
  return null;
}
