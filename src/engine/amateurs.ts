// Recrutamento na GC e na FACEIT: amadores fictícios, baratos, com o potencial real escondido.
import { makeYoungPlayer } from './academy';
import { ACADEMY, AMATEURS, SCOUT } from './config';
import { endOfMonthAfter } from './date';
import { baseOvr } from './form';
import { roundTo } from './format';
import type { Rng } from './rng';
import type { Player } from './types';
import { addMoney, type World } from './world';

export interface Amateur {
  player: Player;
  platform: 'FACEIT' | 'GC';
  /** Nível FACEIT (1–10) ou patente da GC (1–21). */
  level: number;
  stats: { kd: number; adr: number; hs: number; winRate: number };
  /** Luvas para contratar. */
  fee: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** `taken`: ids já usados (banco atual); os novos nunca repetem. */
export function generateAmateurs(rng: Rng, n: number, date: string, taken: Set<string> = new Set()): Amateur[] {
  const out: Amateur[] = [];
  const used = new Set(taken);
  for (let i = 0; i < n; i++) {
    let id = '';
    do id = `am-${date}-${rng.int(10000, 99999)}`;
    while (used.has(id));
    used.add(id);
    const p0 = makeYoungPlayer(rng, id, null, rng.pick(AMATEURS.countries), date, [AMATEURS.levelMin, AMATEURS.levelMax]);
    const ovr = baseOvr(p0);
    const player = { ...p0, potential: Math.min(ACADEMY.maxPotential, ovr + rng.int(AMATEURS.potentialGapMin, AMATEURS.potentialGapMax)) };
    const platform = rng.chance(0.6) ? ('FACEIT' as const) : ('GC' as const);
    // O nível na plataforma acompanha o OVR atual, com ruído (a joia pode estar escondida lá embaixo).
    const noisy = ovr + (rng.next() - 0.5) * 10;
    const level = platform === 'FACEIT' ? clamp(Math.round((noisy - 40) / 3), 1, 10) : clamp(Math.round((noisy - 40) * 0.75), 1, 21);
    out.push({
      player,
      platform,
      level,
      stats: {
        kd: Math.round((0.8 + (ovr - 45) * 0.025 + (rng.next() - 0.5) * 0.2) * 100) / 100,
        adr: Math.round(60 + (ovr - 45) * 1.5 + (rng.next() - 0.5) * 10),
        hs: rng.int(35, 60),
        winRate: rng.int(45, 65),
      },
      fee: roundTo(AMATEURS.feeMin + ((ovr - AMATEURS.levelMin) / (AMATEURS.levelMax - AMATEURS.levelMin)) * (AMATEURS.feeMax - AMATEURS.feeMin), 1000),
    });
  }
  return out;
}

export const isHiddenGem = (a: Amateur) =>
  a.player.potential >= AMATEURS.gemPotential && a.level <= (a.platform === 'FACEIT' ? AMATEURS.gemMaxFaceit : AMATEURS.gemMaxGc);

/** O que o seu olheiro encontra: os mais conhecidos primeiro; joias escondidas só com olheiro 4+. */
export function visibleAmateurs(w: World): Amateur[] {
  const level = w.teams[w.managerTeamId]?.scoutLevel ?? 1;
  const cfg = SCOUT.levels[Math.max(1, Math.min(5, level)) - 1];
  const normalized = (a: Amateur) => (a.platform === 'FACEIT' ? a.level / 10 : a.level / 21);
  const gems = level >= SCOUT.alertsFrom ? w.amateurs.filter(isHiddenGem) : [];
  const known = w.amateurs.filter((a) => !isHiddenGem(a)).sort((a, b) => normalized(b) - normalized(a));
  return [...gems, ...known].slice(0, cfg.visible);
}

/** Todo mês parte do banco sai (foi para outro lugar) e chegam amadores novos. */
export function refreshAmateurs(w: World, rng: Rng): World {
  const keep = w.amateurs.filter(() => !rng.chance(AMATEURS.monthlyTurnover));
  const taken = new Set(w.amateurs.map((a) => a.player.id));
  return { ...w, amateurs: [...keep, ...generateAmateurs(rng, AMATEURS.poolSize - keep.length, w.date, taken)] };
}

export function signAmateur(w: World, playerId: string): { ok: true; world: World } | { ok: false; error: string } {
  const a = w.amateurs.find((x) => x.player.id === playerId);
  if (!a) return { ok: false, error: 'Esse amador não está mais disponível.' };
  const t = w.teams[w.managerTeamId];
  if ((t.academyIds ?? []).length >= ACADEMY.maxSize) return { ok: false, error: `A academy está cheia (${ACADEMY.maxSize}).` };
  if (t.money < a.fee) return { ok: false, error: 'Dinheiro insuficiente para as luvas.' };
  const player: Player = {
    ...a.player,
    teamId: t.id,
    squad: 'academy',
    contract: { teamId: t.id, salary: roundTo(1000 + (a.fee / AMATEURS.feeMax) * 2000, 500), endDate: endOfMonthAfter(w.date, ACADEMY.contractMonths), releaseClause: 100_000 },
  };
  let next: World = {
    ...w,
    amateurs: w.amateurs.filter((x) => x !== a),
    players: { ...w.players, [player.id]: player },
    teams: { ...w.teams, [t.id]: { ...t, academyIds: [...(t.academyIds ?? []), player.id] } },
  };
  next = addMoney(next, t.id, -a.fee, 'contratacao', `${player.nick} (${a.platform})`);
  return { ok: true, world: next };
}
