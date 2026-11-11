// Dados iniciais (editáveis nos JSONs). Elencos e pontos: ranking HLTV de 09/11/2026.
// Atributos, funções, idades e força por mapa são estimativas do jogo.
import type { Player, Team } from '../engine/types';
import teamsJson from './teams.json';
import playersJson from './players.json';
import relationsJson from './relations.json';

export const INITIAL_TEAMS = teamsJson as Team[];
export const INITIAL_PLAYERS = playersJson as Player[];

/** Relações iniciais entre times (proposta, para revisar). Pares fora da lista começam em 0. */
export const INITIAL_RELATIONS = relationsJson as Array<{ a: string; b: string; value: number; note: string }>;

export { BRANDS } from './brands';
