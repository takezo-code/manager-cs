// "Mundo" do jogo: tudo que muda com o tempo, com o mercado e com as finanças.
import type { Relations } from './market/relations';
import type { Amateur } from './amateurs';
import type { BaseLeague } from './baseLeague';
import type { Staff } from './types';
import type { Manager } from './manager/model';
import type { CalendarEvent } from './calendar';
import type { EventResult, SeriesLogEntry } from './ranking';
import type { Player, Team } from './types';

export interface IncomingOffer {
  id: string;
  fromTeamId: string;
  playerId: string;
  fee: number;
  date: string;
  expires: string;
}

export type TransferKind = 'transferencia' | 'multa' | 'troca' | 'livre' | 'fim_contrato' | 'renovacao' | 'dispensa' | 'rescisao';

export interface TransferEntry {
  date: string;
  kind: TransferKind;
  playerId: string;
  fromTeamId: string | null;
  toTeamId: string | null;
  fee: number;
  /** Na troca: o jogador que foi no sentido contrário. */
  otherPlayerId?: string;
}

// ---------- Finanças ----------

export type LedgerCategory =
  | 'patrocinio'
  | 'bonus_titulo'
  | 'premiacao'
  | 'venda'
  | 'salarios'
  | 'contratacao'
  | 'upgrade'
  | 'habilidade'
  | 'olheiro'
  | 'comissao'
  | 'diretoria';

export const LEDGER_LABEL: Record<LedgerCategory, string> = {
  patrocinio: 'Patrocínios',
  bonus_titulo: 'Bônus de título',
  premiacao: 'Premiação',
  venda: 'Venda de jogadores',
  salarios: 'Salários',
  contratacao: 'Contratações e multas',
  upgrade: 'Upgrades de carta',
  habilidade: 'Habilidades',
  olheiro: 'Olheiro',
  comissao: 'Comissão técnica',
  diretoria: 'Aporte da diretoria',
};

/** Movimento de caixa do seu time (positivo entra, negativo sai). */
export interface LedgerEntry {
  date: string;
  category: LedgerCategory;
  amount: number;
  note: string;
}

export type SponsorSlot = 'master' | 'regular';

export interface SponsorContract {
  id: string;
  brand: string;
  slot: SponsorSlot;
  /** Valor mensal em US$. */
  monthly: number;
  endDate: string;
  /** Pago a cada título conquistado. */
  titleBonus: number;
}

export interface SponsorOffer extends SponsorContract {
  months: number;
  expires: string;
}

// ---------- Caixa de entrada ----------

export type InboxKind = 'aumento' | 'conversa' | 'saida' | 'convite' | 'staff_renovacao' | 'staff_aumento' | 'staff_proposta' | 'manager_proposta';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  playerId: string;
  date: string;
  /** Sem resposta até aqui conta como recusar/ignorar. */
  expires: string;
  /** Pedido de aumento: salário pedido. */
  askedSalary?: number;
  /** Convite: evento do calendário. */
  eventId?: string;
  /** Itens da comissão técnica (playerId fica vazio). */
  staffId?: string;
  /** Proposta pelo staff: time interessado. */
  offerTeamId?: string;
}

export interface World {
  date: string;
  /** Time do jogador (as finanças detalhadas e a caixa de entrada são dele). */
  managerTeamId: string;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  relations: Relations;
  /** Propostas recebidas pelos jogadores do seu time. */
  offers: IncomingOffer[];
  transferLog: TransferEntry[];
  ledger: LedgerEntry[];
  sponsorOffers: SponsorOffer[];
  inbox: InboxItem[];
  /** Colocações em eventos (ranking). */
  results: EventResult[];
  /** Séries jogadas (forma no ranking). */
  seriesLog: SeriesLogEntry[];
  /** Eventos do ano atual e do próximo. */
  calendar: CalendarEvent[];
  /** Banco de amadores da GC/FACEIT. */
  amateurs: Amateur[];
  /** Liga de base das academies (temporada atual). */
  baseLeague: BaseLeague;
  /** Comissão técnica: todos os profissionais, empregados e livres. */
  staff: Record<string, Staff>;
  /** O manager (você). `managerTeamId === ''` quando está desempregado. */
  manager: Manager;
}

/** Mensagem curta para o manager (vira notícia de verdade no passo 13). */
export interface WorldEvent {
  kind: 'ok' | 'info' | 'alerta';
  text: string;
}

/** Registra um movimento de caixa, se for do seu time. */
export function record(w: World, teamId: string | null, category: LedgerCategory, amount: number, note: string): World {
  if (!teamId || teamId !== w.managerTeamId || !amount) return w;
  return { ...w, ledger: [{ date: w.date, category, amount, note }, ...w.ledger].slice(0, 600) };
}

/** Soma dinheiro no caixa de um time e registra no extrato. */
export function addMoney(w: World, teamId: string, amount: number, category: LedgerCategory, note: string): World {
  if (!amount) return w;
  const t = w.teams[teamId];
  const next = { ...w, teams: { ...w.teams, [teamId]: { ...t, money: t.money + amount } } };
  return record(next, teamId, category, amount, note);
}
