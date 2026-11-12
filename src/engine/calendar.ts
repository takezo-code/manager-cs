// Calendário: eventos de cada ano, janelas de transferência e férias.
import { EVENT_TEMPLATES } from '../data/calendar';
import { CIRCUIT_TEMPLATES } from '../data/circuit';
import { CALENDAR } from './config';
import type { FormatId, FormatOptions, Tournament } from './tournament/types';
import type { Region } from './types';

export type EventStatus = 'futuro' | 'convites' | 'em_andamento' | 'encerrado';

export interface CalendarEvent {
  /** Ex.: 'iem-abril-2027'. */
  id: string;
  templateId: string;
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  format: FormatId;
  options?: FormatOptions;
  teams: number;
  prizePool: number;
  approximated?: boolean;
  /** 1 = tier 1 (padrão nos saves antigos), 2 ou 3. */
  tier: 1 | 2 | 3;
  rankBand?: [number, number];
  regions?: Region[];
  status: EventStatus;
  /** Convidados pelo ranking (em ordem de seed). */
  invited: string[];
  accepted: string[];
  declined: string[];
  /** Vagas que saem da qualificatória. */
  qualifierSlots: number;
  qualified: string[];
  tournament: Tournament | null;
}

export function buildYear(year: number): CalendarEvent[] {
  return [...EVENT_TEMPLATES, ...CIRCUIT_TEMPLATES].map((t) => {
    const city = t.cities[(((year - 2026) % t.cities.length) + t.cities.length) % t.cities.length];
    return {
      id: `${t.key}-${year}`,
      templateId: t.key,
      name: t.name(city, year),
      city,
      startDate: `${year}-${t.start}`,
      endDate: `${year}-${t.end}`,
      format: t.format,
      options: t.options,
      teams: t.teams,
      prizePool: t.prizePool,
      approximated: t.approximated,
      tier: t.tier ?? 1,
      rankBand: t.rankBand,
      regions: t.regions,
      status: 'futuro' as const,
      invited: [],
      accepted: [],
      declined: [],
      qualifierSlots: t.teams === 32 || (t.tier ?? 1) > 1 ? 0 : CALENDAR.qualifierSlots,
      qualified: [],
      tournament: null,
    };
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

const md = (date: string) => date.slice(5);
const inRange = (date: string, [from, to]: readonly [string, string]) => md(date) >= from && md(date) <= to;

/** Janela de transferências aberta (principal em janeiro, menor no meio do ano). */
export const windowOpen = (date: string) => inRange(date, CALENDAR.mainWindow) || inRange(date, CALENDAR.midWindow);

/** Férias de fim de ano: sem campeonatos. */
export const onVacation = (date: string) => inRange(date, CALENDAR.vacation);

/** Dois eventos com datas que se cruzam. */
export const overlaps = (a: Pick<CalendarEvent, 'startDate' | 'endDate'>, b: Pick<CalendarEvent, 'startDate' | 'endDate'>) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate;

/** Time jogando um evento agora (ainda não eliminado). */
export function teamBusy(calendar: CalendarEvent[], teamId: string): boolean {
  return calendar.some((e) => e.status === 'em_andamento' && !!e.tournament?.participants.includes(teamId) && !e.tournament.placements[teamId]);
}
