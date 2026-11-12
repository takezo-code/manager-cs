import { useState } from 'react';
import { CALENDAR, MAP_NAMES } from '../engine/config';
import { nextOpponent, rivalPreview } from '../engine/staff/preview';
import { staffAttr } from '../engine/staff/model';
import type { CalendarEvent } from '../engine/calendar';
import { formatDate } from '../engine/date';
import { useGame, useWorld } from '../store/game';
import { TeamBadge } from './TeamBadge';
import { money } from './format';
import { EventPanel } from './TournamentView';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Mine = { text: string; tone: 'accent' | 'win' | 'loss' | 'muted' };

function mineOf(ev: CalendarEvent, me: string): Mine | null {
  const t = ev.tournament;
  if (t?.participants.includes(me)) {
    const place = t.placements[me];
    if (place === 'Campeão') return { text: 'Campeão', tone: 'win' };
    if (place) return { text: place, tone: 'muted' };
    return { text: 'Jogando', tone: 'accent' };
  }
  if (ev.accepted.includes(me) || ev.qualified.includes(me)) return { text: 'Confirmado', tone: 'win' };
  if (ev.declined.includes(me)) return { text: 'Recusado', tone: 'muted' };
  if (ev.invited.includes(me)) return { text: 'Convidado', tone: 'accent' };
  if (ev.status === 'convites' && ev.qualifierSlots > 0) return { text: 'Qualificatória', tone: 'muted' };
  return null;
}

/** Faixas do mês (janela de transferências e férias), em texto curto. */
function monthNotes(month: number): string[] {
  const m = String(month + 1).padStart(2, '0');
  const notes: string[] = [];
  const within = ([from, to]: readonly [string, string]) => from.slice(0, 2) <= m && m <= to.slice(0, 2);
  if (within(CALENDAR.mainWindow)) notes.push(`Janela principal: ${CALENDAR.mainWindow[0].slice(3)}–${CALENDAR.mainWindow[1].slice(3)}/${m}`);
  if (within(CALENDAR.midWindow)) notes.push('Janela de meio de ano');
  if (within(CALENDAR.vacation)) notes.push(`Férias a partir de ${CALENDAR.vacation[0].slice(3)}/${m}`);
  return notes;
}

const toneClass: Record<Mine['tone'], string> = {
  accent: 'bg-accent/15 text-accent',
  win: 'bg-win/15 text-win',
  loss: 'bg-loss/15 text-loss',
  muted: 'bg-white/5 text-muted',
};

/** Prévia do analista para a próxima série do seu time. */
function RivalPreviewCard({ rivalId }: { rivalId: string }) {
  const world = useWorld();
  const me = useGame((s) => s.myTeamId)!;
  const rival = world.teams[rivalId];
  const p = rivalPreview(world, rivalId);
  const lei = staffAttr(world, me, 'LEI');
  const analyst = world.teams[me].staff.analista ? world.staff[world.teams[me].staff.analista!] : null;
  const Maps = ({ maps, tone }: { maps: string[]; tone: string }) => (
    <span className="flex flex-wrap gap-1">
      {maps.map((m) => (
        <span key={m} className={`rounded px-2 py-0.5 text-sm font-semibold ${tone}`}>
          {MAP_NAMES[m as keyof typeof MAP_NAMES] ?? m}
        </span>
      ))}
    </span>
  );
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/40 bg-panel px-4 py-3">
      <TeamBadge team={rival} size={36} />
      <div className="min-w-[10rem]">
        <p className="font-semibold">Próximo jogo: {rival.name}</p>
        <p className="text-xs text-muted">
          {analyst ? `Leitura de ${analyst.nick} (${lei})` : 'Sem analista'}
          {lei < 85 ? ': pode ter erro.' : ': leitura confiável.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <div>
          <p className="mb-1">Mapas fortes</p>
          <Maps maps={p.strong} tone="bg-loss/15 text-loss" />
        </div>
        <div>
          <p className="mb-1">Mapas fracos</p>
          <Maps maps={p.weak} tone="bg-win/15 text-win" />
        </div>
      </div>
    </section>
  );
}

export function CalendarPanel() {
  const world = useWorld();
  const calendar = useGame((s) => s.calendar);
  const teams = useGame((s) => s.teams);
  const date = useGame((s) => s.date);
  const me = useGame((s) => s.myTeamId)!;
  const accept = useGame((s) => s.acceptInvite);
  const decline = useGame((s) => s.declineInvite);
  const [openId, setOpenId] = useState<string | null>(null);
  const [year, setYear] = useState(Number(date.slice(0, 4)));

  const opened = calendar.find((e) => e.id === openId);
  if (opened) return <EventPanel ev={opened} onBack={() => setOpenId(null)} />;

  const years = [...new Set(calendar.map((e) => Number(e.startDate.slice(0, 4))))].sort();
  const rival = nextOpponent(world);
  const events = calendar.filter((e) => e.startDate.startsWith(String(year)));
  const months = MONTHS.map((name, i) => ({ name, i, list: events.filter((e) => Number(e.startDate.slice(5, 7)) === i + 1) }));
  const thisMonth = date.startsWith(String(year)) ? Number(date.slice(5, 7)) - 1 : -1;

  return (
    <div className="space-y-4">
      {rival && <RivalPreviewCard rivalId={rival} />}
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`font-display rounded-lg px-3 py-1.5 text-lg font-bold transition ${y === year ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
          >
            Temporada {y}
          </button>
        ))}
        <p className="ml-auto text-sm text-muted">Convites saem 21 dias antes, pelo ranking. Majors e EWC reúnem os 32 times.</p>
      </div>

      <ol className="relative space-y-3 border-l border-line pl-5">
        {months.map(({ name, i, list }) => {
          const notes = monthNotes(i);
          // Meses já passados sem eventos não aparecem (só teriam a faixa da janela).
          const past = date.startsWith(String(year)) ? i < thisMonth : Number(date.slice(0, 4)) > year;
          if (!list.length && (!notes.length || past)) return null;
          return (
            <li key={name} className="relative">
              <span
                className={`absolute top-2 -left-[26px] h-3 w-3 rounded-full border-2 ${i === thisMonth ? 'border-accent bg-accent' : 'border-line bg-bg'}`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className={`font-display text-xl font-bold ${i === thisMonth ? 'text-accent' : ''}`}>{name}</h3>
                {notes.map((n) => (
                  <span key={n} className="text-xs text-muted">
                    {n}
                  </span>
                ))}
              </div>
              <ul className="mt-1.5 space-y-1.5">
                {list.map((ev) => {
                  const mine = mineOf(ev, me);
                  const pending = ev.status === 'convites' && ev.invited.includes(me) && !ev.accepted.includes(me) && !ev.declined.includes(me);
                  const past = ev.status === 'encerrado';
                  return (
                    <li key={ev.id} className={`rounded-xl border border-line bg-panel ${past ? 'opacity-70' : ''}`}>
                      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <button type="button" onClick={() => setOpenId(ev.id)} className="min-w-0 flex-1 text-left">
                          <span className="font-display block truncate text-lg font-bold hover:underline">{ev.name}</span>
                          <span className="block text-xs text-muted">
                            {formatDate(ev.startDate)} a {formatDate(ev.endDate)}
                            {ev.city && ` em ${ev.city}`}. {ev.teams} times, prêmio de {money(ev.prizePool)}.
                            {ev.tournament?.championId && ` Campeão: ${teams[ev.tournament.championId].shortName}.`}
                          </span>
                        </button>
                        {mine && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[mine.tone]}`}>{mine.text}</span>}
                        {pending && (
                          <span className="flex gap-2">
                            <button type="button" onClick={() => accept(ev.id)} className="rounded-lg bg-accent px-3 py-1 text-sm font-semibold text-black">
                              Aceitar
                            </button>
                            <button type="button" onClick={() => decline(ev.id)} className="rounded-lg border border-line px-3 py-1 text-sm text-muted hover:text-ink">
                              Recusar
                            </button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
