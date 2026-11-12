// Campeonato no formato antigo (antes do calendário), usado só nos testes de saves e migração.
// Fica fora do código do jogo.
import type { Team } from '../types';
import { createTournament } from './run';
import type { FormatId, FormatOptions, Tournament } from './types';

/** Eventos do seletor antigo (até o calendário assumir, no passo 9). */
export const TEMPLATES = {
  major: {
    name: 'PGL Major Singapura 2026',
    teams: 32,
    format: 'major32' as FormatId,
    options: {} as FormatOptions,
    prizePool: 1_250_000,
    description:
      '32 times em 3 fases suíças (3 vitórias classificam, 3 derrotas eliminam) e playoffs com 8. Stages 1 e 2: MD1, com MD3 nos jogos que classificam ou eliminam. Stage 3: tudo MD3. Playoffs MD3 e final MD5.',
  },
  iem: {
    name: 'IEM Beijing 2026',
    teams: 16,
    format: 'groups16' as FormatId,
    options: { thirdPlace: true } as FormatOptions,
    prizePool: 1_250_000,
    description:
      '16 times em 2 grupos de dupla eliminação (MD3). O 1º de cada grupo vai direto à semifinal; 2º e 3º jogam as quartas. Playoffs MD3, disputa de 3º lugar e final MD5.',
  },
};
export type TournamentTemplate = keyof typeof TEMPLATES;

/** Cria um evento do seletor antigo com os N primeiros do ranking. */
export function createLegacyTournament(template: TournamentTemplate, teams: Team[], seed: number): Tournament {
  const info = TEMPLATES[template];
  const ranked = [...teams].sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);
  return createTournament({ id: `${template}-${seed}`, ...info }, ranked.slice(0, info.teams), seed);
}
