// Estado do jogo (Zustand). A UI só lê o estado e chama ações; as regras ficam no motor.
import { useMemo } from 'react';
import { create } from 'zustand';
import type { SavedState, Slot } from '../db/saveFormat';
import { START_DATE } from '../engine/date';
import { awardTournament } from '../engine/finance/prizes';
import { acceptSponsor } from '../engine/finance/sponsors';
import { recoverBetweenEvents } from '../engine/form';
import { respondToOffer } from '../engine/market/ai';
import { failedNegotiationEffects, finalizeNegotiation, type Negotiation } from '../engine/market/negotiation';
import type { Relations } from '../engine/market/relations';
import { simulateMatch } from '../engine/match';
import { denyExit, giveRaise, proposeCut, respondInbox, type InboxResponse } from '../engine/morale/conversations';
import { applyJealousy, applySatisfaction } from '../engine/morale/satisfaction';
import { MORALE } from '../engine/config';
import { buySkill, upgradeCard } from '../engine/player';
import { createRng, hashString } from '../engine/rng';
import { createWorld, dailyTick } from '../engine/season';
import { validStarters } from '../engine/squad';
import { createLegacyTournament, playDay, type TournamentTemplate } from '../engine/tournament/run';
import type { Tournament } from '../engine/tournament/types';
import type { MatchFormat, MatchResult, MatchStage, Player, SkillId, Team } from '../engine/types';
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
  /** Avisos (os mais novos primeiro). */
  events: GameEvent[];

  myTeamId: string | null;
  lastMatch: MatchResult | null;
  message: { kind: 'ok' | 'erro'; text: string } | null;
  tournament: Tournament | null;
  /** Resultados completos guardados: os do último dia e todos os do meu time. */
  seriesResults: Record<string, MatchResult>;
  /** Séries jogadas no último dia. */
  lastDayIds: string[];

  openNewCareer(slot: Slot): void;
  startCareer(teamId: string): void;
  loadCareer(slot: Slot, state: SavedState): void;
  toMenu(): void;
  upgrade(playerId: string): void;
  buySkill(playerId: string, skillId: SkillId): void;
  playMatch(opponentId: string, format: MatchFormat, stage: MatchStage, seed: number): void;
  clearMessage(): void;
  startTournament(template: TournamentTemplate): void;
  playNextDay(): void;
  playToEnd(): void;
  closeTournament(): void;
  // Mercado
  advanceDays(days: number): void;
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
}

type WorldFields = 'date' | 'teams' | 'players' | 'relations' | 'offers' | 'transferLog' | 'ledger' | 'sponsorOffers' | 'inbox' | 'myTeamId';

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
  };
}

/** Extrai a parte salva do estado. */
export function savedPart(s: GameState): SavedState | null {
  if (!s.myTeamId) return null;
  return {
    ...worldOf(s),
    events: s.events,
    myTeamId: s.myTeamId,
    tournament: s.tournament,
    seriesResults: s.seriesResults,
    lastDayIds: s.lastDayIds,
  };
}

/** Campos do estado que vão para o save. */
const SAVED_KEYS = [
  'date', 'teams', 'players', 'relations', 'offers', 'transferLog', 'ledger', 'sponsorOffers', 'inbox', 'events',
  'myTeamId', 'tournament', 'seriesResults', 'lastDayIds', 'activeSlot',
] as const satisfies ReadonlyArray<keyof GameState>;

/** Algum campo salvo mudou? (o autosave grava só quando sim). */
export const savedStateChanged = (s: GameState, prev: GameState) => SAVED_KEYS.some((k) => s[k] !== prev[k]);

/** Mercado fechado enquanto há campeonato em andamento (elencos travados durante o evento). */
export const marketOpen = (s: Pick<GameState, 'tournament'>) => !s.tournament || !!s.tournament.championId;

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
    tournament: null,
    seriesResults: {},
    lastDayIds: [],

    openNewCareer: (slot) => set({ screen: 'newCareer', pendingSlot: slot }),

    startCareer: (teamId) => {
      const slot = get().pendingSlot;
      if (!slot) return;
      set({
        ...fromWorld(createWorld(teamId, Date.now())),
        events: [],
        myTeamId: teamId,
        activeSlot: slot,
        pendingSlot: null,
        screen: 'game',
        lastMatch: null,
        message: null,
        tournament: null,
        seriesResults: {},
        lastDayIds: [],
        saveStatus: { kind: 'idle' },
      });
    },

    loadCareer: (slot, state) =>
      set({ ...state, activeSlot: slot, pendingSlot: null, screen: 'game', lastMatch: null, message: null, saveStatus: { kind: 'saved' } }),

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
      const result = simulateMatch({ teamA: a, teamB: b, playersA: roster(a), playersB: roster(b), format, stage, seed });
      set({ lastMatch: result, message: null });
    },

    clearMessage: () => set({ message: null }),

    startTournament: (template) => {
      const { teams, players, myTeamId } = get();
      if (myTeamId && teams[myTeamId].playerIds.length < 5)
        return set({ message: { kind: 'erro', text: 'Seu elenco precisa de 5 jogadores para entrar num campeonato.' } });
      const t = createLegacyTournament(template, Object.values(teams), Math.floor(Math.random() * 1e9));
      // Descanso antes do evento.
      const ps = { ...players };
      for (const teamId of t.participants) for (const pid of teams[teamId].playerIds) ps[pid] = recoverBetweenEvents(ps[pid]);
      set({ tournament: t, players: ps, seriesResults: {}, lastDayIds: [] });
    },

    playNextDay: () => {
      const s = get();
      if (!s.tournament || s.tournament.championId || !s.myTeamId) return;
      const out = playDay(s.tournament, s.teams, s.players);
      const ids = Object.keys(out.results);
      // Guarda os jogos do meu time para sempre; os outros só até o próximo dia.
      const kept: Record<string, MatchResult> = {};
      for (const [id, r] of Object.entries(s.seriesResults)) if (r.teamAId === s.myTeamId || r.teamBId === s.myTeamId) kept[id] = r;
      // O dia passa (fechamento do mês incluso), com o mercado fechado.
      let w: World = { ...worldOf(s), players: out.players };
      const tick = dailyTick(w, { marketOpen: false });
      w = tick.world;
      const events = [...tick.events];
      // Fim do campeonato: premiação, bônus de título e satisfação.
      if (out.tournament.championId) {
        w = awardTournament(w, out.tournament);
        const place = out.tournament.placements[s.myTeamId];
        if (place) events.push({ kind: 'ok', text: `${out.tournament.name} encerrado. ${s.teams[s.myTeamId].shortName}: ${place}.` });
      }
      commitWorld(w, events, { tournament: out.tournament, seriesResults: { ...kept, ...out.results }, lastDayIds: ids });
    },

    playToEnd: () => {
      for (let i = 0; i < 60 && get().tournament && !get().tournament!.championId; i++) get().playNextDay();
    },

    closeTournament: () => set({ tournament: null, seriesResults: {}, lastDayIds: [] }),

    advanceDays: (days) => {
      const s = get();
      if (!s.myTeamId) return;
      if (!marketOpen(s)) return set({ message: { kind: 'erro', text: 'Há um campeonato em andamento: avance pelos dias do campeonato.' } });
      let w = worldOf(s);
      let events: GameEvent[] = [];
      for (let i = 0; i < days; i++) {
        const out = dailyTick(w, { marketOpen: true, rng: createRng(hashString(`${w.date}:${s.activeSlot}:${s.myTeamId}`)) });
        w = out.world;
        events = [...stamp(w.date, out.events), ...events];
      }
      set({ ...fromWorld(w), events: [...events, ...s.events].slice(0, MAX_EVENTS) });
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
  return useMemo(
    () => worldOf({ date, myTeamId, teams, players, relations, offers, transferLog, ledger, sponsorOffers, inbox }),
    [date, myTeamId, teams, players, relations, offers, transferLog, ledger, sponsorOffers, inbox],
  );
}
