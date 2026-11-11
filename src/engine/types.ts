// Tipos centrais do jogo. O motor (src/engine) não depende de React.
import type { SponsorContract } from './world';

export const ATTR_KEYS = ['MIR', 'REF', 'NOC', 'UTL', 'MEN', 'EQP'] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];
export type Attributes = Record<AttrKey, number>;

export const ROLES = ['IGL', 'AWPER', 'ENTRY', 'SUPPORT', 'LURKER'] as const;
export type Role = (typeof ROLES)[number];

/** Carta base, sempre derivada do OVR atual. */
export type CardTier = 'bronze' | 'prata' | 'ouro';

/** 0 = base, 1 = azul, 2 = vermelha, 3 = Prime (rosa). */
export type Evolution = 0 | 1 | 2 | 3;

export type Phase = 'destaque' | 'em_alta' | 'boa_fase' | 'normal' | 'abaixo' | 'ma_fase';

export type SkillId =
  | 'reflexo_dos_deuses'
  | 'mira_calibrada'
  | 'deus_do_clutch'
  | 'mao_de_ouro'
  | 'sem_medo'
  | 'cerebro_tatico'
  | 'flash_perfeito'
  | 'fantasma'
  | 'mestre_do_spray'
  | 'rei_do_pistol'
  | 'sangue_frio'
  | 'muralha'
  | 'trade_instantaneo';

export interface Skill {
  id: SkillId;
  name: string;
  type: 'atributo' | 'passiva';
  description: string;
  /** Só para habilidades de atributo. */
  attrBonus?: { attr: AttrKey; value: number };
  /** Funções que podem usar. Vazio = todas. */
  allowedRoles: Role[];
  /** Funções proibidas (ex.: Mestre do Spray não serve para AWPer). */
  forbiddenRoles?: Role[];
  price: number;
}

export type Region = 'EU' | 'CIS' | 'SA' | 'NA' | 'ASIA';

export interface Contract {
  teamId: string;
  /** Salário mensal em US$. */
  salary: number;
  /** Data de fim (AAAA-MM-DD). */
  endDate: string;
  /** Multa rescisória em US$. */
  releaseClause: number;
}

/** Estado de humor e histórico de conversas do jogador (satisfação). */
export interface PlayerMood {
  /** Promessa de titularidade válida até esta data. */
  promiseUntil: string | null;
  /** O manager negou a saída: fica até o fim do contrato. */
  exitDenied: boolean;
  lastRaise: string | null;
  raiseRefusals: number;
  lastCut: string | null;
  cutRefusals: number;
  /** Salário antes da redução (ele espera voltar quando o time melhorar). */
  salaryBeforeCut: number | null;
  lastRequest: string | null;
}

export interface PlayerAward {
  kind: 'MVP' | 'EVP';
  event: string;
  date: string;
}

export interface Player {
  id: string;
  nick: string;
  country: string;
  age: number;
  role: Role;
  teamId: string | null;
  /** Atributos da carta base, antes de evolução, habilidade e fase. */
  baseAttributes: Attributes;
  evolution: Evolution;
  skillId: SkillId | null;
  phase: Phase;
  /** Partidas seguidas na fase atual (usado pela má fase que piora). */
  phaseStreak: number;
  /** 0 a 100. */
  energy: number;
  /** 0 a 100. */
  satisfaction: number;
  /** Ratings dos últimos mapas jogados (mais recente no fim), usados para calcular a fase. */
  recentRatings: number[];
  /** Potencial máximo (oculto na UI até o olheiro, no passo 10). */
  potential: number;
  /** 0 a 1: quanto o jogador aceita jogar fora da região dele. */
  regionFlex: number;
  /** Colocado à venda pelo time (atrai mais propostas da IA). */
  transferListed: boolean;
  /** null = agente livre. */
  contract: Contract | null;
  mood: PlayerMood;
  /** MVPs e EVPs conquistados (o MVP vira carta especial). */
  awards: PlayerAward[];
  /** Bônus de MVP (+2 em todos os atributos) válido até esta data. */
  mvpUntil: string | null;
}

export const MAP_IDS = ['ancient', 'anubis', 'cache', 'dust2', 'inferno', 'mirage', 'nuke'] as const;
export type MapId = (typeof MAP_IDS)[number];

export interface Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  /** Região onde o time joga (pesa na preferência dos jogadores). */
  region: Region;
  hltvRank: number;
  hltvPoints: number;
  /** Cor principal para a UI, enquanto não há logos. */
  color: string;
  /** Elenco: 5 a 7 jogadores. */
  playerIds: string[];
  /** Os 5 titulares (jogam as partidas). */
  starters: string[];
  /** Força do time em cada mapa, 0 a 100. */
  mapStrength: Record<MapId, number>;
  money: number;
  sponsors: SponsorContract[];
  /** Meses seguidos com salários atrasados. */
  lateMonths: number;
  /** Salários devidos (atrasados). */
  arrears: number;
  /** Pontos reais do ranking no início (decaem em 12 meses) e o elenco que os conquistou. */
  legacyPoints: number;
  legacyRoster: string[];
  /** Histórico semanal do ranking. */
  rankHistory: Array<{ date: string; rank: number; points: number }>;
}

export type MatchFormat = 'MD1' | 'MD3' | 'MD5';
/** Peso da partida no campeonato: afeta pressão (Mental, Sangue Frio). */
export type MatchStage = 'grupos' | 'playoffs' | 'final';

export type Side = 'CT' | 'T';
export type BuyType = 'pistol' | 'eco' | 'force' | 'full';
export type RoundEndReason = 'eliminacao' | 'bomba' | 'defuse' | 'tempo';

export interface VetoStep {
  teamId: string | null; // null = decider
  action: 'ban' | 'pick' | 'decider';
  map: MapId;
}

export interface PlayerMatchStats {
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  firstKills: number;
  clutchesWon: number;
  /** Rounds com kill, assistência, sobrevivência ou morte trocada. */
  kastRounds: number;
  rounds: number;
}

export interface RoundResult {
  number: number;
  winnerTeamId: string;
  reason: RoundEndReason;
  ctTeamId: string;
  buys: Record<string, BuyType>;
  scoreAfter: Record<string, number>;
  narration: string;
}

export interface MapResult {
  map: MapId;
  pickedBy: string | null;
  score: Record<string, number>;
  winnerTeamId: string;
  rounds: RoundResult[];
  stats: Record<string, PlayerMatchStats>;
  overtimes: number;
}

export interface MatchResult {
  seed: number;
  format: MatchFormat;
  stage: MatchStage;
  teamAId: string;
  teamBId: string;
  veto: VetoStep[];
  maps: MapResult[];
  mapScore: Record<string, number>;
  winnerTeamId: string;
  /** Rating médio por jogador na série. */
  ratings: Record<string, number>;
}
