// Cálculo de atributos efetivos, OVR, carta, upgrade e habilidades.
import {
  ATTR_MAX,
  ATTR_MIN,
  AWARDS,
  EVOLUTION_BONUS_PER_LEVEL,
  MA_FASE_MAX_EXTRA,
  MA_FASE_WORSEN_EVERY,
  PHASE_EFFECTS,
  ROLE_WEIGHTS,
  SKILLS,
  SKILL_SWAP_FEE,
  UPGRADE_PRICES,
  tierForOvr,
} from './config';
import { ATTR_KEYS, type AttrKey, type Attributes, type CardTier, type Player, type Role, type SkillId } from './types';

const clamp = (v: number) => Math.max(ATTR_MIN, Math.min(ATTR_MAX, v));

/** Atributos da função em ordem de importância (maior peso primeiro). */
export function attrsByImportance(role: Role): AttrKey[] {
  const w = ROLE_WEIGHTS[role];
  return [...ATTR_KEYS].sort((a, b) => w[b] - w[a]);
}

/** Modificadores da fase atual, aplicados nos atributos mais importantes da função. */
export function phaseModifiers(player: Pick<Player, 'role' | 'phase' | 'phaseStreak'>): Partial<Attributes> {
  const { count, value } = PHASE_EFFECTS[player.phase];
  if (count === 0) return {};
  let v = value;
  if (player.phase === 'ma_fase') {
    const extra = Math.min(MA_FASE_MAX_EXTRA, Math.floor(Math.max(0, player.phaseStreak - 1) / MA_FASE_WORSEN_EVERY));
    v -= extra;
  }
  const mods: Partial<Attributes> = {};
  for (const key of attrsByImportance(player.role).slice(0, count)) mods[key] = v;
  return mods;
}

/**
 * Atributos efetivos: base + evolução + habilidade de atributo + fase, limitados a 1–99.
 * É o que a simulação usa e o que define o OVR.
 */
export function effectiveAttributes(player: Player): Attributes {
  const evo = player.evolution * EVOLUTION_BONUS_PER_LEVEL + (player.mvpUntil ? AWARDS.mvpBonus : 0);
  const skill = player.skillId ? SKILLS[player.skillId] : null;
  const phase = phaseModifiers(player);
  const out = {} as Attributes;
  for (const key of ATTR_KEYS) {
    let v = player.baseAttributes[key] + evo + (phase[key] ?? 0);
    if (skill?.attrBonus?.attr === key) v += skill.attrBonus.value;
    out[key] = clamp(v);
  }
  return out;
}

/** OVR de um conjunto de atributos para uma função. Nunca é armazenado: sempre recalculado. */
export function ovrFor(attrs: Attributes, role: Role): number {
  const w = ROLE_WEIGHTS[role];
  let sum = 0;
  for (const key of ATTR_KEYS) sum += attrs[key] * w[key];
  // Folga para erro de ponto flutuante: 75,5 vira 75,4999… dependendo da ordem da soma.
  return Math.round(sum + 1e-9);
}

// Jogadores são imutáveis (cada mudança cria um objeto novo): o OVR fica em cache pelo objeto.
const ovrCache = new WeakMap<Player, number>();

export function playerOvr(player: Player): number {
  let v = ovrCache.get(player);
  if (v === undefined) {
    v = ovrFor(effectiveAttributes(player), player.role);
    ovrCache.set(player, v);
  }
  return v;
}

/** Carta base pelo OVR atual: um upgrade só muda a cor da faixa se o OVR alcançar o corte. */
export function playerTier(player: Player): CardTier {
  return tierForOvr(playerOvr(player));
}

// ---------- Upgrade ----------

export function upgradePrice(player: Player): number | null {
  if (player.evolution >= 3) return null;
  return UPGRADE_PRICES[player.evolution as 0 | 1 | 2];
}

export type ActionResult<T> = { ok: true; value: T; cost: number } | { ok: false; error: string };

export function upgradeCard(player: Player, money: number): ActionResult<Player> {
  const price = upgradePrice(player);
  if (price === null) return { ok: false, error: 'A carta já é Prime.' };
  if (money < price) return { ok: false, error: 'Dinheiro insuficiente.' };
  return {
    ok: true,
    value: { ...player, evolution: (player.evolution + 1) as Player['evolution'] },
    cost: price,
  };
}

// ---------- Habilidades ----------

export function canUseSkill(role: Role, skillId: SkillId): boolean {
  const s = SKILLS[skillId];
  if (s.forbiddenRoles?.includes(role)) return false;
  return s.allowedRoles.length === 0 || s.allowedRoles.includes(role);
}

export function skillPrice(player: Player, skillId: SkillId): number {
  const base = SKILLS[skillId].price;
  return player.skillId ? base + SKILL_SWAP_FEE : base;
}

export function buySkill(player: Player, skillId: SkillId, money: number): ActionResult<Player> {
  if (player.skillId === skillId) return { ok: false, error: 'O jogador já tem essa habilidade.' };
  if (!canUseSkill(player.role, skillId)) return { ok: false, error: 'Habilidade não disponível para essa função.' };
  const cost = skillPrice(player, skillId);
  if (money < cost) return { ok: false, error: 'Dinheiro insuficiente.' };
  return { ok: true, value: { ...player, skillId }, cost };
}
