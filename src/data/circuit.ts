// Circuito tier 2 e tier 3 (eventos reais, datas aproximadas). Cada edição é um template próprio.
// Quem joga: faixa do ranking HLTV e região; faltando time, entram os próximos da região e, no tier 3, academies.
import type { Region } from '../engine/types';
import type { EventTemplate } from './calendar';

const MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const EUROPA: Region[] = ['EU', 'CIS'];
const pad = (n: number) => String(n).padStart(2, '0');

interface Serie {
  key: string;
  name: string;
  /** Cada edição: [mês, dia de início, dia de fim]. */
  dates: [number, number, number][];
  tier: 2 | 3;
  teams: 8 | 16;
  rankBand: [number, number];
  regions?: Region[];
  prizePool: number;
  /** Nome leva o mês (séries mensais) em vez do número da edição. */
  monthly?: boolean;
}

function editions(s: Serie): EventTemplate[] {
  return s.dates.map(([m, from, to], i) => ({
    key: `${s.key}-${pad(m)}`,
    organizer: s.name,
    name: (_c, y) => (s.monthly ? `${s.name} ${y} — ${MES[m - 1]}` : `${s.name} ${y}${s.dates.length > 1 ? ` #${i + 1}` : ''}`),
    cities: ['Online'],
    start: `${pad(m)}-${pad(from)}`,
    end: `${pad(m)}-${pad(to)}`,
    format: s.teams === 16 ? 'swiss16' : 'bracket8',
    teams: s.teams,
    prizePool: s.prizePool,
    approximated: true,
    tier: s.tier,
    rankBand: s.rankBand,
    regions: s.regions,
  }));
}

const months = (list: number[], from: number, to: number): [number, number, number][] => list.map((m) => [m, from, to]);

const SERIES: Serie[] = [
  // ---------- Tier 2 ----------
  { key: 'stake-pulse', name: 'Stake Pulse Beat', dates: [[2, 10, 13], [4, 22, 25], [7, 8, 11], [10, 14, 17]], tier: 2, teams: 8, rankBand: [21, 45], prizePool: 100_000 },
  { key: 'starseries', name: 'StarLadder StarSeries', dates: [[5, 27, 30], [10, 20, 23]], tier: 2, teams: 8, rankBand: [21, 45], prizePool: 250_000 },
  { key: 'thunderpick', name: 'Thunderpick World Championship', dates: [[10, 6, 9]], tier: 2, teams: 8, rankBand: [21, 45], prizePool: 200_000 },
  { key: 'european-pro-league', name: 'European Pro League', dates: months([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 2, 9), tier: 2, teams: 16, rankBand: [21, 70], regions: EUROPA, prizePool: 50_000, monthly: true },
  { key: 'cct-europe', name: 'CCT Europe Series', dates: months([2, 4, 6, 8, 10], 15, 22), tier: 2, teams: 16, rankBand: [25, 80], regions: EUROPA, prizePool: 50_000 },
  { key: 'cct-sa', name: 'CCT South America Series', dates: months([3, 5, 7, 9, 11], 10, 13), tier: 2, teams: 8, rankBand: [21, 200], regions: ['SA'], prizePool: 30_000 },
  { key: 'nodwin-clutch', name: 'NODWIN Clutch Series', dates: months([2, 4, 6, 8, 10], 24, 27), tier: 2, teams: 8, rankBand: [21, 200], regions: ['ASIA'], prizePool: 30_000 },
  { key: 'extremesland', name: 'ZOWIE eXTREMESLAND Asia Open', dates: [[11, 17, 20]], tier: 2, teams: 8, rankBand: [21, 200], regions: ['ASIA'], prizePool: 50_000 },
  // ---------- Tier 3 ----------
  ...(['EU', 'SA', 'NA', 'ASIA'] as const).map(
    (r): Serie => ({
      key: `challenger-${r.toLowerCase()}`,
      name: `ESL Challenger League ${({ EU: 'Europa', SA: 'América do Sul', NA: 'América do Norte', ASIA: 'Ásia' } as const)[r]}`,
      dates: months([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 24, 27),
      tier: 3,
      teams: 8,
      rankBand: [40, 200],
      regions: r === 'EU' ? EUROPA : [r],
      prizePool: 10_000,
      monthly: true,
    }),
  ),
  { key: 'crossfire', name: 'CROSSFIRE', dates: [[3, 3, 6], [6, 3, 6], [9, 3, 6], [11, 3, 6]], tier: 3, teams: 8, rankBand: [21, 200], regions: ['NA'], prizePool: 15_000 },
  { key: 'tipsport-rush', name: 'Tipsport RUSH', dates: [[4, 8, 11]], tier: 3, teams: 8, rankBand: [50, 200], regions: EUROPA, prizePool: 20_000 },
  { key: 'urban-riga', name: 'Urban Riga Open', dates: [[7, 15, 18]], tier: 3, teams: 8, rankBand: [50, 200], regions: EUROPA, prizePool: 20_000 },
  { key: 'ukic-masters', name: 'UKIC Masters', dates: [[3, 17, 20], [9, 16, 19]], tier: 3, teams: 8, rankBand: [50, 200], regions: EUROPA, prizePool: 20_000 },
];

export const CIRCUIT_TEMPLATES: EventTemplate[] = SERIES.flatMap(editions);
