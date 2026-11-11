import type { MapId, MatchFormat, MatchStage } from '../types';

/** Uma série (MD1/MD3/MD5) entre dois times. A é o de melhor seed e começa o veto. */
export interface Series {
  id: string;
  teamAId: string;
  teamBId: string;
  format: MatchFormat;
  stage: MatchStage;
  /** Ex.: "Rodada 3 · 1-1", "Upper bracket · Semifinal". */
  label: string;
  /** Dia do campeonato em que foi jogada. */
  day?: number;
  winnerId?: string;
  loserId?: string;
  maps?: Array<{ map: MapId; a: number; b: number }>;
  score?: [number, number];
}

export interface SwissRecord {
  w: number;
  l: number;
  opponents: string[];
}

/** Suíço no formato do Major: 16 times, 3 vitórias classificam e 3 derrotas eliminam. */
export interface SwissStage {
  kind: 'swiss';
  name: string;
  /** Times na ordem de seed (1º = melhor). */
  seeds: string[];
  /** Todos os jogos em MD3 (Stage 3 do Major). Senão: MD1, e MD3 só quando classifica ou elimina. */
  allBo3: boolean;
  /** Primeira colocação dos eliminados nesta fase (ex.: 25 no Stage 1 do Major). */
  eliminatedBasePlace: number;
  records: Record<string, SwissRecord>;
  rounds: Series[][];
}

export type DESlot =
  | 'UQF1'
  | 'UQF2'
  | 'UQF3'
  | 'UQF4'
  | 'USF1'
  | 'USF2'
  | 'UF'
  | 'LR1A'
  | 'LR1B'
  | 'LR2A'
  | 'LR2B'
  | 'DEC';

/**
 * Grupo de 8 em dupla eliminação. Com 3 classificados (IEM, BLAST): vencedor da final do upper,
 * perdedor da final do upper e vencedor da final do lower. Com 4 (EWC): vencedores das semis do upper
 * e vencedores da 2ª rodada do lower.
 */
export interface DoubleElimGroup {
  kind: 'de8';
  name: string;
  seeds: string[];
  advance: 3 | 4;
  /** Abertura (quartas do upper) em MD1. */
  openingBo1: boolean;
  /** Colocação de quem cai em cada partida eliminatória. */
  placeLabels: Partial<Record<DESlot, string>>;
  matches: Partial<Record<DESlot, Series>>;
}

export type Gsl4Slot = 'O1' | 'O2' | 'W' | 'L' | 'D';

/** Grupo GSL de 4 (BLAST Rivals): abertura 1×4 e 2×3, vencedores, perdedores e decisão; 3 classificados. */
export interface Gsl4Group {
  kind: 'gsl4';
  name: string;
  seeds: string[];
  /** Colocação de quem cai (o perdedor da partida dos perdedores). */
  eliminatedPlace: string;
  matches: Partial<Record<Gsl4Slot, Series>>;
}

export type Group = DoubleElimGroup | Gsl4Group;

export interface GroupsStage {
  kind: 'groups';
  name: string;
  groups: Group[];
}

export type SlotSource = { team: string } | { winnerOf: string } | { loserOf: string };

export interface BracketSlot {
  id: string;
  label: string;
  format: MatchFormat;
  stage: MatchStage;
  a: SlotSource;
  b: SlotSource;
  /** Colocação de quem perde aqui (ex.: "5º–8º", "Vice"). */
  loserPlace: string;
  /** Colocação de quem vence aqui (só na disputa de 3º: "3º"). */
  winnerPlace?: string;
  series?: Series;
}

/** Mata-mata (eliminação simples). */
export interface BracketStage {
  kind: 'bracket';
  name: string;
  /** Em ordem: rodadas anteriores primeiro. */
  slots: BracketSlot[];
}

export type Stage = SwissStage | GroupsStage | BracketStage;

export type FormatId = 'major32' | 'groups16' | 'swiss16' | 'epl24' | 'ewc32' | 'rivals8' | 'bracket8';

export interface FormatOptions {
  /** Disputa de 3º lugar (MD3) entre os perdedores das semis. */
  thirdPlace?: boolean;
  /** Abertura dos grupos em MD1. */
  openingBo1?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  format: FormatId;
  options: FormatOptions;
  prizePool: number;
  seed: number;
  day: number;
  participants: string[];
  stages: Stage[];
  stageIdx: number;
  championId: string | null;
  /** Colocação final de quem já saiu (ex.: "9º–11º", "Vice"). */
  placements: Record<string, string>;
}
