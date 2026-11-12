// Academy: jovens de 16 a 19 anos, fora do elenco principal, promovidos a qualquer momento.
import { ACADEMY, MANAGER, MARKET, REGION_COUNTRIES } from './config';
import { daysBetween, endOfMonthAfter } from './date';
import { baseOvr } from './form';
import { DEFAULT_MOOD } from './morale/satisfaction';
import { createRng, hashString, type Rng } from './rng';
import { weakestRole } from './squad';
import { ATTR_KEYS, ROLES, type Attributes, type Player, type Region } from './types';
import type { World, WorldEvent } from './world';

const SYL_A = ['ka', 'ze', 'vi', 'lu', 'mo', 'ra', 'ne', 'to', 'xi', 'du', 'bi', 'fe', 'gu', 'ja', 'le', 'pi', 'ro', 'sa', 'ti', 'vo', 'kr', 'zy'];
const SYL_B = ['x', 'zin', 'rk', 'lo', 'nn', 'tz', 'ra', 'v1', 'k', 'sy', 'do', 'no', 'ch', 'ex', 'iq', 'ov'];

/** Apelido fictício para jovens e amadores. */
export const youthNick = (rng: Rng) => `${rng.pick(SYL_A)}${rng.pick(SYL_B)}${rng.chance(0.3) ? rng.int(1, 99) : ''}`;

/** Atributos em torno de um nível, com viés na função (os mais importantes um pouco acima). */
export function youthAttributes(rng: Rng, level: number, role: Player['role']): Attributes {
  const bias: Record<Player['role'], Partial<Attributes>> = {
    AWPER: { MIR: 3, REF: 2 },
    ENTRY: { REF: 3, MIR: 2 },
    SUPPORT: { UTL: 3, EQP: 2 },
    LURKER: { NOC: 3, MEN: 2 },
    IGL: { EQP: 3, NOC: 2 },
  };
  const out = {} as Attributes;
  for (const k of ATTR_KEYS) out[k] = Math.max(35, Math.min(80, Math.round(level + (bias[role][k] ?? 0) + (rng.next() - 0.5) * 8)));
  return out;
}

export function makeYoungPlayer(rng: Rng, id: string, teamId: string | null, country: string, date: string, levelRange: [number, number]): Player {
  const role = rng.pick(ROLES);
  const baseAttributes = youthAttributes(rng, rng.int(levelRange[0], levelRange[1]), role);
  const p: Player = {
    id,
    nick: youthNick(rng),
    country,
    age: rng.int(ACADEMY.minAge, ACADEMY.maxAge),
    role,
    teamId,
    squad: teamId ? 'academy' : 'principal',
    baseAttributes,
    evolution: 0,
    skillId: null,
    phase: 'normal',
    phaseStreak: 0,
    energy: 100,
    satisfaction: 70,
    recentRatings: [],
    potential: 0,
    regionFlex: Math.round((0.4 + rng.next() * 0.6) * 100) / 100,
    transferListed: false,
    contract: teamId
      ? { teamId, salary: rng.int(ACADEMY.salaryMin, ACADEMY.salaryMax) * 100, endDate: endOfMonthAfter(date, ACADEMY.contractMonths), releaseClause: 100_000 }
      : null,
    mood: { ...DEFAULT_MOOD },
    awards: [],
    mvpUntil: null,
    trainingGains: {},
    growth: {},
  };
  return { ...p, potential: Math.min(ACADEMY.maxPotential, baseOvr(p) + rng.int(ACADEMY.potentialGapMin, ACADEMY.potentialGapMax)) };
}

/** País de um jovem da região (segue a mesma tabela de regiões do jogo). */
export const youthCountry = (rng: Rng, region: Region): string => rng.pick(REGION_COUNTRIES[region]);

/** Gera N jovens para a academy de um time. */
export function generateYouth(w: World, rng: Rng, teamId: string, n: number): Player[] {
  const region = w.teams[teamId].region;
  const out: Player[] = [];
  for (let i = 0; i < n; i++) {
    let id = '';
    do id = `ac-${teamId}-${rng.int(1000, 9999)}`;
    while (w.players[id] || out.some((p) => p.id === id));
    out.push(makeYoungPlayer(rng, id, teamId, youthCountry(rng, region), w.date, [ACADEMY.levelMin, ACADEMY.levelMax]));
  }
  return out;
}

/** Coloca jovens na academy do time. */
export function addToAcademy(w: World, teamId: string, youth: Player[]): World {
  const players = { ...w.players };
  for (const p of youth) players[p.id] = { ...p, teamId, squad: 'academy', academySince: w.date };
  const t = w.teams[teamId];
  return { ...w, players, teams: { ...w.teams, [teamId]: { ...t, academyIds: [...(t.academyIds ?? []), ...youth.map((p) => p.id)] } } };
}

/** Dia 1º: jovens que estão na sua academy há pelo menos 1 mês ficam marcados como revelados por você. */
export function markRevealed(w: World): World {
  const org = w.managerTeamId;
  if (!org) return w;
  const players = { ...w.players };
  let changed = false;
  for (const id of w.teams[org]?.academyIds ?? []) {
    const p = players[id];
    if (p && !p.revealed && (!p.academySince || daysBetween(p.academySince, w.date) >= MANAGER.revealedDays)) {
      players[id] = { ...p, revealed: true };
      changed = true;
    }
  }
  return changed ? { ...w, players } : w;
}

export function promote(w: World, playerId: string): { ok: true; world: World } | { ok: false; error: string } {
  const p = w.players[playerId];
  if (!p || p.squad !== 'academy' || !p.teamId) return { ok: false, error: 'Esse jogador não está numa academy.' };
  const t = w.teams[p.teamId];
  if (t.playerIds.length >= MARKET.squadMax) return { ok: false, error: `O elenco principal está cheio (${MARKET.squadMax}). Venda ou troque alguém antes.` };
  const teams = {
    ...w.teams,
    [t.id]: { ...t, academyIds: t.academyIds.filter((id) => id !== playerId), playerIds: [...t.playerIds, playerId], starters: t.starters.length < 5 ? [...t.starters, playerId] : t.starters },
  };
  // Revelado por você: sobe feliz.
  // "Sobem juntos": só vale com o manager ainda na organização (time ou academy).
  const withManager = w.managerTeamId === t.id;
  const satisfaction = p.revealed && withManager ? Math.min(100, p.satisfaction + MANAGER.revealedBonus) : p.satisfaction;
  return { ok: true, world: { ...w, teams, players: { ...w.players, [playerId]: { ...p, squad: 'principal', satisfaction } } } };
}

/** Promoção pedida pelo manager: só jovens da academy do seu time. */
export function promoteMine(w: World, playerId: string): { ok: true; world: World } | { ok: false; error: string } {
  if (w.players[playerId]?.teamId !== w.managerTeamId) return { ok: false, error: 'Esse jovem não é da sua academy.' };
  return promote(w, playerId);
}

/** Tira o jovem da academy e o deixa como agente livre. */
function releaseYouth(w: World, playerId: string): World {
  const p = w.players[playerId];
  const t = w.teams[p.teamId!];
  return {
    ...w,
    teams: { ...w.teams, [t.id]: { ...t, academyIds: t.academyIds.filter((id) => id !== playerId) } },
    players: { ...w.players, [playerId]: { ...p, teamId: null, contract: null, squad: 'principal' } },
    transferLog: [{ date: w.date, kind: 'dispensa' as const, playerId, fromTeamId: t.id, toTeamId: null, fee: 0 }, ...w.transferLog].slice(0, 300),
  };
}

/**
 * Virada do ano: quem fez 20 anos deixa a academy. A IA promove os bons (se houver vaga) e
 * libera os demais; os seus saem como agentes livres. A IA repõe a academy até 5.
 */
export function academyYearEnd(world: World, rngIn?: Rng): { world: World; events: WorldEvent[] } {
  let w = world;
  const rng = rngIn ?? createRng(hashString(`academy:${world.date}`));
  const events: WorldEvent[] = [];
  const me = w.managerTeamId;
  for (const t of Object.values(w.teams)) {
    for (const id of t.academyIds ?? []) {
      const p = w.players[id];
      if (p.age <= ACADEMY.maxAge) continue;
      if (t.id === me) {
        w = releaseYouth(w, id);
        events.push({ kind: 'alerta', text: `${p.nick} fez ${p.age} anos e deixou a academy como agente livre.` });
        continue;
      }
      const team = w.teams[t.id];
      // Elenco incompleto: promove; completo, só se ele for quase tão bom quanto o pior titular.
      const good = team.playerIds.length < 5 || baseOvr(p) >= weakestRole(team, w.players).ovr - 2;
      const r = good ? promote(w, id) : null;
      w = r?.ok ? r.world : releaseYouth(w, id);
    }
    if (t.id !== me) {
      const missing = ACADEMY.aiSize - w.teams[t.id].academyIds.length;
      if (missing > 0) w = addToAcademy(w, t.id, generateYouth(w, rng, t.id, missing));
    }
  }
  return { world: w, events };
}

/** Dezembro: aviso de quem vai deixar a sua academy na virada do ano. */
export function academyAgingWarning(w: World): WorldEvent[] {
  const org = w.managerTeamId;
  const t = org ? w.teams[org] : undefined;
  return (t?.academyIds ?? [])
    .map((id) => w.players[id])
    .filter((p) => p.age >= ACADEMY.maxAge)
    .map((p) => ({ kind: 'alerta' as const, text: `${p.nick} faz 20 anos em janeiro: promova até lá ou ele sai da academy.` }));
}
