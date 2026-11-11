// Calendário tier 1 baseado no calendário real de 2026 (datas e formatos pesquisados).
// Cada edição troca a cidade-sede: a lista de cidades gira por ano (2026 = primeira da lista).
import type { FormatId, FormatOptions } from '../engine/tournament/types';

export interface EventTemplate {
  /** Identificador estável do evento (sem ano). */
  key: string;
  organizer: 'ESL' | 'BLAST' | 'PGL' | 'Perfect World' | 'EWC' | 'Major';
  /** Nome do evento; recebe a cidade e o ano. */
  name: (city: string, year: number) => string;
  cities: string[];
  /** Mês-dia (MM-DD). */
  start: string;
  end: string;
  format: FormatId;
  options?: FormatOptions;
  teams: number;
  prizePool: number;
  /** Formato não confirmado nas fontes: aproximado. */
  approximated?: boolean;
}

const eplSeason = (year: number, half: 0 | 1) => 23 + (year - 2026) * 2 + half;

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    key: 'blast-bounty', organizer: 'BLAST', name: (c, y) => `BLAST Bounty ${c} ${y}`, cities: ['Malta', 'Copenhague'],
    start: '01-22', end: '01-25', format: 'bracket8', teams: 8, prizePool: 750_000, approximated: true,
  },
  {
    key: 'iem-inverno', organizer: 'ESL', name: (c, y) => `IEM ${c} ${y}`, cities: ['Kraków', 'Katowice'],
    start: '01-28', end: '02-08', format: 'epl24', options: { thirdPlace: true }, teams: 24, prizePool: 1_000_000, approximated: true,
  },
  {
    key: 'epl-1', organizer: 'ESL', name: (_c, y) => `ESL Pro League ${y} — Temporada ${eplSeason(y, 0)}`, cities: ['Estocolmo', 'Malta'],
    start: '02-27', end: '03-15', format: 'epl24', options: { thirdPlace: true }, teams: 24, prizePool: 1_000_000,
  },
  {
    key: 'blast-open-1', organizer: 'BLAST', name: (c, y) => `BLAST Open ${c} ${y}`, cities: ['Roterdã', 'Lisboa'],
    start: '03-18', end: '03-29', format: 'groups16', teams: 16, prizePool: 1_000_000,
  },
  {
    key: 'pgl-primavera', organizer: 'PGL', name: (c, y) => `PGL ${c} ${y}`, cities: ['Bucareste', 'Cluj-Napoca'],
    start: '04-04', end: '04-11', format: 'swiss16', teams: 16, prizePool: 1_250_000,
  },
  {
    key: 'iem-abril', organizer: 'ESL', name: (c, y) => `IEM ${c} ${y}`, cities: ['Rio', 'Melbourne'],
    start: '04-13', end: '04-19', format: 'groups16', options: { thirdPlace: true }, teams: 16, prizePool: 1_000_000,
  },
  {
    key: 'pgl-maio', organizer: 'PGL', name: (c, y) => `PGL ${c} ${y}`, cities: ['Astana', 'Belgrado'],
    start: '05-09', end: '05-17', format: 'swiss16', teams: 16, prizePool: 1_600_000,
  },
  {
    key: 'iem-maio', organizer: 'ESL', name: (c, y) => `IEM ${c} ${y}`, cities: ['Atlanta', 'Dallas'],
    start: '05-11', end: '05-17', format: 'groups16', options: { thirdPlace: true }, teams: 16, prizePool: 1_000_000,
  },
  {
    key: 'cs-asia', organizer: 'Perfect World', name: (c, y) => `CS Asia Championships ${c} ${y}`, cities: ['Xangai', 'Hangzhou'],
    start: '05-20', end: '05-24', format: 'groups16', options: { openingBo1: true }, teams: 16, prizePool: 1_000_000,
  },
  {
    key: 'major-1', organizer: 'Major', name: (c, y) => `${c} Major ${y}`, cities: ['IEM Colônia', 'BLAST Austin', 'PGL Copenhague'],
    start: '06-02', end: '06-21', format: 'major32', teams: 32, prizePool: 1_250_000,
  },
  {
    key: 'ewc', organizer: 'EWC', name: (c, y) => `Esports World Cup ${y} (${c})`, cities: ['Riad', 'Paris'],
    start: '08-12', end: '08-23', format: 'ewc32', teams: 32, prizePool: 2_000_000,
  },
  {
    key: 'blast-open-2', organizer: 'BLAST', name: (c, y) => `BLAST Open ${c} ${y}`, cities: ['Porto', 'Londres'],
    start: '08-26', end: '09-06', format: 'groups16', teams: 16, prizePool: 1_000_000,
  },
  {
    key: 'epl-2', organizer: 'ESL', name: (_c, y) => `ESL Pro League ${y} — Temporada ${eplSeason(y, 1)}`, cities: ['Katowice', 'Estocolmo'],
    start: '10-03', end: '10-11', format: 'epl24', options: { thirdPlace: true }, teams: 24, prizePool: 1_000_000,
  },
  {
    key: 'pgl-masters', organizer: 'PGL', name: (c, y) => `PGL Masters ${c} ${y}`, cities: ['Bucareste', 'Belgrado'],
    start: '10-24', end: '10-31', format: 'swiss16', options: { thirdPlace: true }, teams: 16, prizePool: 1_250_000,
  },
  {
    key: 'iem-china', organizer: 'ESL', name: (c, y) => `IEM ${c} ${y}`, cities: ['Beijing', 'Chengdu'],
    start: '11-02', end: '11-08', format: 'groups16', options: { thirdPlace: true }, teams: 16, prizePool: 1_250_000,
  },
  {
    key: 'blast-rivals', organizer: 'BLAST', name: (c, y) => `BLAST Rivals ${c} ${y}`, cities: ['Hong Kong', 'Fort Worth'],
    start: '11-11', end: '11-15', format: 'rivals8', teams: 8, prizePool: 1_000_000,
  },
  {
    key: 'major-2', organizer: 'Major', name: (c, y) => `${c} Major ${y}`, cities: ['PGL Singapura', 'StarLadder Budapeste', 'Perfect World Xangai'],
    start: '11-25', end: '12-13', format: 'major32', teams: 32, prizePool: 1_250_000,
  },
];
