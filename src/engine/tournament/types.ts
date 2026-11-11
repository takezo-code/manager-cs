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

/** Grupo de 8 em dupla eliminação (IEM): 1º, 2º e 3º se classificam. */
export interface DoubleElimGroup {
  name: string;
  seeds: string[];
  matches: Partial<Record<DESlot, Series>>;
}

export interface GroupsStage {
  kind: 'groups';
  name: string;
  groups: DoubleElimGroup[];
}

export type SlotSource = { team: string } | { winnerOf: string };

export interface BracketSlot {
  id: string;
  label: string;
  format: MatchFormat;
  stage: MatchStage;
  a: SlotSource;
  b: SlotSource;
  /** Colocação de quem perde aqui (ex.: "5º–8º", "Vice"). */
  loserPlace: string;
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

export type TournamentTemplate = 'major' | 'iem';

export interface Tournament {
  id: string;
  name: string;
  template: TournamentTemplate;
  seed: number;
  day: number;
  participants: string[];
  stages: Stage[];
  stageIdx: number;
  championId: string | null;
  /** Colocação final de quem já saiu (ex.: "9º–11º", "Vice"). */
  placements: Record<string, string>;
}
