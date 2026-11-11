// Desenvolvimento por idade: jovens crescem rumo ao POT, auge de 22 a 26, queda gradual depois.
import { ACADEMY, ATTR_MAX, DEVELOPMENT, ROLE_WEIGHTS } from './config';
import { baseOvr } from './form';
import { ATTR_KEYS, type Player } from './types';
import type { World } from './world';

export function monthlyGrowth(age: number): number {
  return DEVELOPMENT.curve.find((c) => age <= c.maxAge)!.perMonth;
}

/**
 * Muda o OVR do jogador em `ovrDelta` (fracionado), distribuindo pelos atributos conforme os pesos
 * da função. Crescimento para no POT; queda para no piso de cada atributo.
 */
export function developPlayer(p: Player, ovrDelta: number): Player {
  if (!ovrDelta || (ovrDelta > 0 && baseOvr(p) >= p.potential)) return p;
  const w = ROLE_WEIGHTS[p.role];
  const sumSq = ATTR_KEYS.reduce((s, k) => s + w[k] * w[k], 0);
  const growth = { ...(p.growth ?? {}) };
  const attrs = { ...p.baseAttributes };
  for (const k of ATTR_KEYS) {
    const acc = (growth[k] ?? 0) + (ovrDelta * w[k]) / sumSq;
    const whole = Math.trunc(acc);
    attrs[k] = Math.max(DEVELOPMENT.minAttr, Math.min(ATTR_MAX, attrs[k] + whole));
    growth[k] = acc - whole;
  }
  const next = { ...p, baseAttributes: attrs, growth };
  // Não passa do POT por arredondamento.
  return ovrDelta > 0 && baseOvr(next) > p.potential ? p : next;
}

/** Desenvolvimento do mês para todos os jogadores. */
export function monthlyDevelopment(w: World): World {
  const players = { ...w.players };
  for (const [id, p] of Object.entries(players)) players[id] = developPlayer(p, monthlyGrowth(p.age));
  return { ...w, players };
}

/** 1º de janeiro: todos fazem aniversário; amadores que passam de 19 anos saem do banco da GC/FACEIT. */
export function ageUp(w: World): World {
  return {
    ...w,
    players: Object.fromEntries(Object.entries(w.players).map(([id, p]) => [id, { ...p, age: p.age + 1 }])),
    amateurs: (w.amateurs ?? [])
      .map((a) => ({ ...a, player: { ...a.player, age: a.player.age + 1 } }))
      .filter((a) => a.player.age <= ACADEMY.maxAge),
  };
}
