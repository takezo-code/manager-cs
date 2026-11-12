// Estado do jogo (Zustand). A UI só lê o estado e chama ações; as regras ficam no motor.
import { useMemo } from 'react';
import { create } from 'zustand';
import type { SavedState, Slot } from '../db/saveFormat';
import { START_DATE } from '../engine/date';
import { acceptSponsor } from '../engine/finance/sponsors';
import { respondToOffer } from '../engine/market/ai';
import { failedNegotiationEffects, finalizeNegotiation, type Negotiation } from '../engine/market/negotiation';
import type { Relations } from '../engine/market/relations';
import { simulateMatch } from '../engine/match';
import { staffAttrsOf } from '../engine/staff/effects';
import { onYouthPromoted } from '../engine/manager/effects';
import { acceptOffer, askBudget, declineOffer, resign } from '../engine/manager/offers';
import { startCourse } from '../engine/staff/career';
import { hireStaff, releaseStaff, respondStaffInbox } from '../engine/staff/market';
import type { StaffAttr } from '../engine/types';
import { denyExit, giveRaise, proposeCut, respondInbox, type InboxResponse } from '../engine/morale/conversations';
import { applyJealousy, applySatisfaction } from '../engine/morale/satisfaction';
import { MORALE } from '../engine/config';
import { buySkill, upgradeCard } from '../engine/player';
import { createRng, hashString } from '../engine/rng';
import { createWorld, dailyTick } from '../engine/season';
import { validStarters } from '../engine/squad';
import { windowOpen } from '../engine/calendar';
import { acceptInvite, declineInvite } from '../engine/schedule';
import { signAmateur, type Amateur } from '../engine/amateurs';
import { promote } from '../engine/academy';
import { upgradeScout } from '../engine/scout';
import type { BaseLeague } from '../engine/baseLeague';
import type { Staff } from '../engine/types';
import type { Manager, ManagerProfile } from '../engine/manager/model';
import type { CalendarEvent } from '../engine/calendar';
import type { EventResult, SeriesLogEntry } from '../engine/ranking';
import type { MatchFormat, MatchResult, MatchStage, Player, SkillId, Team, TrainingPlan } from '../engine/types';
import {
  addMoney,
  type IncomingOffer,
  type InboxItem,
  type LedgerEntry,
  type SponsorOffer,
  type TransferEntry,
  type World,
  type WorldEvent,
} from '../engine/world';

export type Screen = 'menu' | 'newCareer' | 'game';
export type GameEvent = WorldEvent & { date: string };

export interface GameState {
  screen: Screen;
  /** Slot da carreira aberta (o autosave grava nele). */
  activeSlot: Slot | null;
  /** Slot escolhido para a carreira nova, antes de escolher o time. */
  pendingSlot: Slot | null;
  saveStatus: { kind: 'idle' | 'saving' | 'saved' | 'erro'; at?: number; error?: string };

  // Mundo
  date: string;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  relations: Relations;
  offers: IncomingOffer[];
  transferLog: TransferEntry[];
  ledger: LedgerEntry[];
  sponsorOffers: SponsorOffer[];
  inbox: InboxItem[];
  results: EventResult[];
  seriesLog: SeriesLogEntry[];
  calendar: CalendarEvent[];
  amateurs: Amateur[];
  baseLeague: BaseLeague;
  staff: Record<string, Staff>;
  manager: Manager;
  fans: Record<string, number>;
  news: World['news'];
  feed: World['feed'];
  posts: World['posts'];
  /** Avisos (os mais novos primeiro). */
  events: GameEvent[];

  myTeamId: string | null;
  lastMatch: MatchResult | null;
  message: { kind: 'ok' | 'erro'; text: string } | null;
  /** Resultados completos guardados: os do último dia e todos os do meu time. */
  seriesResults: Record<string, MatchResult>;
  /** Séries jogadas no último dia. */
  lastDayIds: string[];

  openNewCareer(slot: Slot): void;
  startCareer(teamId: string, profile?: ManagerProfile): void;
  loadCareer(slot: Slot, state: SavedState): void;
  toMenu(): void;
  upgrade(playerId: string): void;
  buySkill(playerId: string, skillId: SkillId): void;
  playMatch(opponentId: string, format: MatchFormat, stage: MatchStage, seed: number): void;
  clearMessage(): void;

  // Mercado
  /** Avança N dias, ou até o próximo jogo do seu time ('jogo'; no máximo 60 dias). */
  advance(target: number | 'jogo'): void;
  acceptInvite(eventId: string): void;
  declineInvite(eventId: string): void;
  setTraining(plan: TrainingPlan): void;
  setStarter(benchId: string, starterId: string): void;
  toggleListed(playerId: string): void;
  commitNegotiation(neg: Negotiation): void;
  respondOffer(offerId: string, response: Parameters<typeof respondToOffer>[2]): void;
  // Finanças e vestiário
  acceptSponsorOffer(offerId: string): void;
  declineSponsorOffer(offerId: string): void;
  respondInboxItem(itemId: string, response: InboxResponse): void;
  raiseSalary(playerId: string, pct: number): void;
  proposeSalaryCut(playerIds: string[], pct: number): void;
  denyPlayerExit(playerId: string): void;
  promoteYouth(playerId: string): void;
  signAmateur(playerId: string): void;
  upgradeScout(): void;
  hireStaff(staffId: string): void;
  releaseStaff(staffId: string): void;
  startStaffCourse(staffId: string, attr: StaffAttr): void;
  respondStaffItem(itemId: string, accept: boolean): void;
  acceptManagerOffer(itemId: string): void;
  declineManagerOffer(itemId: string): void;
  askBoardBudget(itemId: string): void;
  resignManager(): void;
}

type WorldFields =
  | 'date'
  | 'teams'
  | 'players'
  | 'relations'
  | 'offers'
  | 'transferLog'
  | 'ledger'
  | 'sponsorOffers'
  | 'inbox'
  | 'results'
  | 'seriesLog'
  | 'calendar'
  | 'amateurs'
  | 'baseLeague'
  | 'staff'
  | 'manager'
  | 'fans'
  | 'news'
  | 'feed'
  | 'posts'
  | 'myTeamId';

export const worldOf = (s: Pick<GameState, WorldFields>): World => ({
  date: s.date,
  managerTeamId: s.myTeamId ?? '',
  teams: s.teams,
  players: s.players,
  relations: s.relations,
  offers: s.offers,
  transferLog: s.transferLog,
  ledger: s.ledger,
  sponsorOffers: s.sponsorOffers,
  inbox: s.inbox,
  results: s.results,
  seriesLog: s.seriesLog,
  calendar: s.calendar,
  amateurs: s.amateurs,
  baseLeague: s.baseLeague,
  staff: s.staff,
  manager: s.manager,
  fans: s.fans,
  news: s.news,
  feed: s.feed,
  posts: s.posts,
});

/** Campos do mundo para gravar de volta no estado. */
function fromWorld(w: World) {
  return {
    date: w.date,
    teams: w.teams,
    players: w.players,
    relations: w.relations,
    offers: w.offers,
    transferLog: w.transferLog,
    ledger: w.ledger,
    sponsorOffers: w.sponsorOffers,
    inbox: w.inbox,
    results: w.results,
    seriesLog: w.seriesLog,
    calendar: w.calendar,
    amateurs: w.amateurs,
    baseLeague: w.baseLeague,
    staff: w.staff,
    manager: w.manager,
    fans: w.fans,
    news: w.news,
    feed: w.feed,
    posts: w.posts,
    // Demissão ou troca de time mudam o time do manager.
    myTeamId: w.managerTeamId || null,
  };
}

/** Extrai a parte salva do estado. */
export function savedPart(s: GameState): SavedState | null {
  // Desempregado também salva (myTeamId vazio); fora do jogo, não.
  if (s.screen !== 'game' || !s.activeSlot) return null;
  return {
    ...worldOf(s),
    events: s.events,
    myTeamId: s.myTeamId ?? '',
    seriesResults: s.seriesResults,
    lastDayIds: s.lastDayIds,
  };
}

/** Guarda só os últimos jogos do seu time (os MatchResult completos pesam no save). */
export function trimMyResults(results: Record<string, MatchResult>, me: string, keep = 40): Record<string, MatchResult> {
  const mine = Object.entries(results).filter(([, r]) => r.teamAId === me || r.teamBId === me);
  return Object.fromEntries(mine.slice(-keep));
}

/** Campos do estado que vão para o save. */
const SAVED_KEYS = [
  'date', 'teams', 'players', 'relations', 'offers', 'transferLog', 'ledger', 'sponsorOffers', 'inbox', 'results', 'seriesLog', 'calendar', 'amateurs', 'baseLeague', 'staff', 'manager', 'fans', 'news', 'feed', 'posts', 'events',
  'myTeamId', 'seriesResults', 'lastDayIds', 'activeSlot',
] as const satisfies ReadonlyArray<keyof GameState>;

/** Algum campo salvo mudou? (o autosave grava só quando sim). */
export const savedStateChanged = (s: GameState, prev: GameState) => SAVED_KEYS.some((k) => s[k] !== prev[k]);

/** Janela de transferências aberta na data atual. */
export const marketOpen = (s: Pick<GameState, 'date'>) => windowOpen(s.date);

const MAX_EVENTS = 80;
const stamp = (date: string, events: WorldEvent[]): GameEvent[] => events.map((e) => ({ ...e, date })).reverse();

export const useGame = create<GameState>((set, get) => {
  /** Aplica uma mudança no mundo e acrescenta avisos. */
  const commitWorld = (w: World, events: WorldEvent[] = [], extra: Partial<GameState> = {}) =>
    set((s) => ({ ...fromWorld(w), events: [...stamp(w.date, events), ...s.events].slice(0, MAX_EVENTS), ...extra }));

  return {
    screen: 'menu',
    activeSlot: null,
    pendingSlot: null,
    saveStatus: { kind: 'idle' },
    ...fromWorld(createWorld('')),
    date: START_DATE,
    events: [],
    myTeamId: null,
    lastMatch: null,
    message: null,
    seriesResults: {},
    lastDayIds: [],

    openNewCareer: (slot) => set({ screen: 'newCareer', pendingSlot: slot }),

    startCareer: (teamId, profile) => {
      const slot = get().pendingSlot;
      if (!slot) return;
      set({
        ...fromWorld(createWorld(teamId, Date.now(), profile)),
        events: [],
        myTeamId: teamId,
        activeSlot: slot,
        pendingSlot: null,
        screen: 'game',
        lastMatch: null,
        message: null,
            seriesResults: {},
        lastDayIds: [],
        saveStatus: { kind: 'idle' },
      });
    },

    loadCareer: (slot, state) =>
      set({ ...state, myTeamId: state.myTeamId || null, activeSlot: slot, pendingSlot: null, screen: 'game', lastMatch: null, message: null, saveStatus: { kind: 'saved' } }),

    toMenu: () => set({ screen: 'menu', activeSlot: null, pendingSlot: null, myTeamId: null, lastMatch: null, message: null }),

    upgrade: (playerId) => {
      const s = get();
      if (!s.myTeamId) return;
      const r = upgradeCard(s.players[playerId], s.teams[s.myTeamId].money);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      let w: World = { ...worldOf(s), players: { ...s.players, [playerId]: r.value } };
      w = addMoney(w, s.myTeamId, -r.cost, 'upgrade', r.value.nick);
      w = applySatisfaction(w, playerId, MORALE.events.upgrade);
      commitWorld(w, [], { message: { kind: 'ok', text: `${r.value.nick} evoluiu a carta.` } });
    },

    buySkill: (playerId, skillId) => {
      const s = get();
      if (!s.myTeamId) return;
      const r = buySkill(s.players[playerId], skillId, s.teams[s.myTeamId].money);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      let w: World = { ...worldOf(s), players: { ...s.players, [playerId]: r.value } };
      w = addMoney(w, s.myTeamId, -r.cost, 'habilidade', r.value.nick);
      w = applySatisfaction(w, playerId, MORALE.events.skill);
      commitWorld(w, [], { message: { kind: 'ok', text: `${r.value.nick} ganhou uma habilidade nova.` } });
    },

    playMatch: (opponentId, format, stage, seed) => {
      const { teams, players, myTeamId } = get();
      if (!myTeamId) return;
      const mine = teams[myTeamId];
      const opp = teams[opponentId];
      if (mine.playerIds.length < 5) return set({ message: { kind: 'erro', text: 'Seu elenco precisa de 5 jogadores para jogar.' } });
      // Melhor ranqueado é o time A (começa o veto).
      const [a, b] = mine.hltvRank <= opp.hltvRank ? [mine, opp] : [opp, mine];
      const roster = (t: Team) => validStarters(t, players).map((id) => players[id]);
      const result = simulateMatch({ teamA: a, teamB: b, playersA: roster(a), playersB: roster(b), format, stage, seed, staffA: staffAttrsOf(worldOf(get()), a.id), staffB: staffAttrsOf(worldOf(get()), b.id) });
      set({ lastMatch: result, message: null });
    },

    clearMessage: () => set({ message: null }),

    advance: (target) => {
      const s = get();
      if (s.screen !== 'game') return;
      // Desempregado também avança o tempo (me vazio).
      const me = s.myTeamId ?? '';
      const maxDays = target === 'jogo' ? 60 : target;
      let w = worldOf(s);
      let events: GameEvent[] = [];
      // Guarda os jogos do seu time; dos outros, só os do último dia.
      const kept: Record<string, MatchResult> = {};
      for (const [id, r] of Object.entries(s.seriesResults)) if (r.teamAId === me || r.teamBId === me) kept[id] = r;
      let lastDay: Record<string, MatchResult> = {};
      for (let i = 0; i < maxDays; i++) {
        const out = dailyTick(w, { rng: createRng(hashString(`${w.date}:${s.activeSlot}:${me}`)) });
        w = out.world;
        events = [...stamp(w.date, out.events), ...events];
        if (Object.keys(out.results).length) lastDay = out.results;
        for (const [id, r] of Object.entries(out.results)) if (r.teamAId === me || r.teamBId === me) kept[id] = r;
        const myGame = Object.values(out.results).some((r) => r.teamAId === me || r.teamBId === me);
        if (target === 'jogo' && (myGame || w.inbox.length > s.inbox.length)) break;
        // Demitido (ou time trocado) no meio do avanço: para para você ver.
        if (w.managerTeamId !== me) break;
      }
      set({
        ...fromWorld(w),
        events: [...events, ...s.events].slice(0, MAX_EVENTS),
        seriesResults: { ...trimMyResults(kept, me), ...lastDay },
        lastDayIds: Object.keys(lastDay),
      });
    },

    acceptInvite: (eventId) => {
      const r = acceptInvite(worldOf(get()), eventId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: 'Convite aceito.' } });
    },

    declineInvite: (eventId) => commitWorld(declineInvite(worldOf(get()), eventId), [], { message: { kind: 'ok', text: 'Convite recusado.' } }),

    setTraining: (plan) => {
      const { teams, myTeamId } = get();
      if (!myTeamId) return;
      set({ teams: { ...teams, [myTeamId]: { ...teams[myTeamId], training: plan } } });
    },

    setStarter: (benchId, starterId) => {
      const { teams, myTeamId } = get();
      if (!myTeamId) return;
      const t = teams[myTeamId];
      if (!t.starters.includes(starterId) || t.starters.includes(benchId)) return;
      set({ teams: { ...teams, [myTeamId]: { ...t, starters: t.starters.map((id) => (id === starterId ? benchId : id)) } } });
    },

    toggleListed: (playerId) => {
      const { players } = get();
      const p = players[playerId];
      set({ players: { ...players, [playerId]: { ...p, transferListed: !p.transferListed } } });
    },

    commitNegotiation: (neg) => {
      const s = get();
      let w = neg.phase === 'done' ? finalizeNegotiation(worldOf(s), neg) : failedNegotiationEffects(worldOf(s), neg);
      const p = s.players[neg.playerId];
      const events: WorldEvent[] = [];
      if (neg.phase === 'done' && neg.kind !== 'renewal' && neg.kind !== 'trade') {
        // Contratação com salário alto pode gerar ciúme.
        const j = applyJealousy(w, neg.buyerId, neg.playerId);
        w = j.world;
        if (j.jealous.length) events.push({ kind: 'alerta', text: `Ciúme no elenco com o salário de ${p.nick}: ${j.jealous.map((id) => w.players[id].nick).join(', ')}.` });
      }
      const text =
        neg.phase === 'done'
          ? neg.kind === 'renewal'
            ? `${p.nick} renovou o contrato.`
            : `Contratação fechada: ${p.nick} assinou com ${s.teams[neg.buyerId].shortName}!`
          : `Negociação por ${p.nick} encerrada sem acordo.`;
      commitWorld(w, events, { message: { kind: neg.phase === 'done' ? 'ok' : 'erro', text } });
    },

    respondOffer: (offerId, response) => {
      const s = get();
      const out = respondToOffer(worldOf(s), offerId, response, createRng(hashString(`${s.date}:${offerId}`)));
      commitWorld(out.world, [out.event], { message: { kind: out.event.kind === 'alerta' ? 'erro' : 'ok', text: out.event.text } });
    },

    acceptSponsorOffer: (offerId) => {
      const s = get();
      const r = acceptSponsor(worldOf(s), offerId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: 'Patrocínio assinado.' } });
    },

    declineSponsorOffer: (offerId) => set((s) => ({ sponsorOffers: s.sponsorOffers.filter((o) => o.id !== offerId) })),

    respondInboxItem: (itemId, response) => {
      const s = get();
      const out = respondInbox(worldOf(s), itemId, response);
      commitWorld(out.world, [out.event], { message: { kind: out.event.kind === 'alerta' ? 'erro' : 'ok', text: out.event.text } });
    },

    raiseSalary: (playerId, pct) => {
      const out = giveRaise(worldOf(get()), playerId, pct);
      commitWorld(out.world, [out.event], { message: { kind: 'ok', text: out.event.text } });
    },

    proposeSalaryCut: (playerIds, pct) => {
      const s = get();
      const out = proposeCut(worldOf(s), playerIds, pct, createRng(hashString(`${s.date}:corte:${playerIds.join(',')}`)));
      const nick = (id: string) => out.world.players[id].nick;
      const list = (ids: string[], one: string, many: string) => (ids.length === 1 ? `${nick(ids[0])} ${one}.` : `${ids.map(nick).join(', ')} ${many}.`);
      const parts = [
        out.accepted.length && list(out.accepted, 'aceitou', 'aceitaram'),
        out.refused.length && list(out.refused, 'recusou', 'recusaram'),
        out.blocked.length && `Cedo demais para pedir de novo a ${out.blocked.map(nick).join(', ')}.`,
      ].filter(Boolean);
      const text = `Redução de ${pct}%: ${parts.join(' ')}`;
      commitWorld(out.world, [{ kind: out.refused.length ? 'alerta' : 'ok', text }], { message: { kind: out.accepted.length ? 'ok' : 'erro', text } });
    },

    denyPlayerExit: (playerId) => {
      const out = denyExit(worldOf(get()), playerId);
      commitWorld(out.world, [out.event], { message: { kind: 'erro', text: out.event.text } });
    },

    promoteYouth: (playerId) => {
      const r = promote(worldOf(get()), playerId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(onYouthPromoted(r.world), [], { message: { kind: 'ok', text: `${r.world.players[playerId].nick} subiu para o elenco principal.` } });
    },

    signAmateur: (playerId) => {
      const r = signAmateur(worldOf(get()), playerId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: `${r.world.players[playerId].nick} entrou na academy.` } });
    },

    upgradeScout: () => {
      const r = upgradeScout(worldOf(get()));
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      const me = get().myTeamId!;
      commitWorld(r.world, [], { message: { kind: 'ok', text: `Olheiro agora é nível ${r.world.teams[me].scoutLevel}.` } });
    },

    hireStaff: (staffId) => {
      const r = hireStaff(worldOf(get()), staffId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: `${r.world.staff[staffId].nick} foi contratado.` } });
    },

    releaseStaff: (staffId) => {
      const r = releaseStaff(worldOf(get()), staffId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: `${r.world.staff[staffId].nick} foi dispensado.` } });
    },

    startStaffCourse: (staffId, attr) => {
      const r = startCourse(worldOf(get()), staffId, attr);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: `${r.world.staff[staffId].nick} começou um curso.` } });
    },

    respondStaffItem: (itemId, accept) => {
      const r = respondStaffInbox(worldOf(get()), itemId, accept);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      commitWorld(r.world, [], { message: { kind: 'ok', text: accept ? 'Resposta enviada: aceito.' : 'Resposta enviada: recusado.' } });
    },

    acceptManagerOffer: (itemId) => {
      const r = acceptOffer(worldOf(get()), itemId);
      if (!r.ok) return set({ message: { kind: 'erro', text: r.error } });
      const team = r.world.teams[r.world.managerTeamId];
      commitWorld(r.world, [{ kind: 'ok', text: `Você é o novo manager da ${team.name}.` }], { message: { kind: 'ok', text: `Bem-vindo à ${team.name}.` } });
    },

    declineManagerOffer: (itemId) => commitWorld(declineOffer(worldOf(get()), itemId), [], { message: { kind: 'ok', text: 'Proposta recusada.' } }),

    askBoardBudget: (itemId) => {
      const s = get();
      const out = askBudget(worldOf(s), itemId, createRng(hashString(`orcamento:${itemId}`)));
      commitWorld(out.world, [out.event], { message: { kind: out.event.kind === 'ok' ? 'ok' : 'erro', text: out.event.text } });
    },

    resignManager: () => {
      const w = worldOf(get());
      const team = w.teams[w.managerTeamId];
      commitWorld(resign(w), [{ kind: 'alerta', text: `Você pediu demissão da ${team?.name ?? 'equipe'}.` }], { lastMatch: null });
    },
  };
});

/** Hook com o mundo atual (para a UI chamar funções do motor). */
export function useWorld(): World {
  const date = useGame((s) => s.date);
  const myTeamId = useGame((s) => s.myTeamId);
  const teams = useGame((s) => s.teams);
  const players = useGame((s) => s.players);
  const relations = useGame((s) => s.relations);
  const offers = useGame((s) => s.offers);
  const transferLog = useGame((s) => s.transferLog);
  const ledger = useGame((s) => s.ledger);
  const sponsorOffers = useGame((s) => s.sponsorOffers);
  const inbox = useGame((s) => s.inbox);
  const results = useGame((s) => s.results);
  const seriesLog = useGame((s) => s.seriesLog);
  const calendar = useGame((s) => s.calendar);
  const amateurs = useGame((s) => s.amateurs);
  const baseLeague = useGame((s) => s.baseLeague);
  const staff = useGame((s) => s.staff);
  const manager = useGame((s) => s.manager);
  const fans = useGame((s) => s.fans);
  const news = useGame((s) => s.news);
  const feed = useGame((s) => s.feed);
  const posts = useGame((s) => s.posts);
  return useMemo(
    () => worldOf({ date, myTeamId, teams, players, relations, offers, transferLog, ledger, sponsorOffers, inbox, results, seriesLog, calendar, amateurs, baseLeague, staff, manager, fans, news, feed, posts }),
    [date, myTeamId, teams, players, relations, offers, transferLog, ledger, sponsorOffers, inbox, results, seriesLog, calendar, amateurs, baseLeague, staff, manager, fans, news, feed, posts],
  );
}
