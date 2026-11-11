import type { CardTier, Evolution, Role } from '../engine/types';

export const money = (v: number) =>
  v >= 1_000_000 ? `US$ ${(v / 1_000_000).toFixed(2).replace('.', ',')} mi` : `US$ ${Math.round(v / 1000)} mil`;

export const ROLE_LABEL: Record<Role, string> = {
  IGL: 'IGL',
  AWPER: 'AWPer',
  ENTRY: 'Entry',
  SUPPORT: 'Suporte',
  LURKER: 'Lurker',
};

export const ATTR_LABEL = {
  MIR: 'Mira',
  REF: 'Reflexo',
  NOC: 'Noção de jogo',
  UTL: 'Utilidade',
  MEN: 'Mental',
  EQP: 'Equipe',
} as const;

export const TIER_LABEL: Record<CardTier, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };

/** Cor principal da carta: evolução manda na cor; sem evolução, a faixa (bronze/prata/ouro). */
export function cardColor(tier: CardTier, evolution: Evolution): string {
  if (evolution === 1) return 'var(--color-evo1)';
  if (evolution === 2) return 'var(--color-evo2)';
  if (evolution === 3) return 'var(--color-prime)';
  return `var(--color-${tier})`;
}

export const tierColor = (tier: CardTier) => `var(--color-${tier})`;

export const ratingColor = (r: number) =>
  r >= 1.15 ? 'text-win' : r >= 1.0 ? 'text-ink' : r >= 0.9 ? 'text-muted' : 'text-loss';
