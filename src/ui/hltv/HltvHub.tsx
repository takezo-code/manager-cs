// Aba HLTV: partidas, resultados, eventos, ranking e notícias, no formato de listas do site.
import { useState } from 'react';
import { addDays, daysBetween, formatDate } from '../../engine/date';
import { pendingSeries } from '../../engine/tournament/run';
import type { CalendarEvent } from '../../engine/calendar';
import { useGame, useWorld } from '../../store/game';
import { SubTabs } from '../shell/GameShell';
import { TeamBadge } from '../TeamBadge';
import { money } from '../format';
import { MatchView } from '../MatchView';
import { EventPanel } from '../TournamentView';
import { RankingPanel } from '../RankingPanel';
import { NewsPanel } from '../NewsPanel';

type HubTab = 'partidas' | 'resultados' | 'eventos' | 'ranking' | 'noticias';

/** Bloco com título de data, como as listas do site. */
function DayBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-panel">
      <h3 className="font-display border-b border-white/10 bg-white/5 px-4 py-2 text-[13px] font-bold tracking-wide">{title}</h3>
      <ul className="divide-y divide-white/5">{children}</ul>
    </section>
  );
}

function Matches() {
  const w = useWorld();
  const me = w.managerTeamId;
  const tomorrow = addDays(w.date, 1);
  const live = w.calendar.filter((e) => e.status === 'em_andamento' && e.tournament && !e.tournament.championId);
  const rows = live.flatMap((ev) => {
    const t = ev.tournament!;
    return pendingSeries(t.stages[t.stageIdx]).map((s) => ({ ev, s, when: ev.startDate > tomorrow ? ev.startDate : tomorrow }));
  });
  const upcoming = w.calendar.filter((e) => e.status !== 'encerrado' && e.status !== 'em_andamento').slice(0, 6);
  const byDate = [...new Set(rows.map((r) => r.when))].sort();
  return (
    <div className="space-y-4">
      {byDate.length ? (
        byDate.map((d) => (
          <DayBlock key={d} title={d === tomorrow ? `Amanhã · ${formatDate(d)}` : formatDate(d)}>
            {rows
              .filter((r) => r.when === d)
              .map(({ ev, s }) => {
                const mine = s.teamAId === me || s.teamBId === me;
                return (
                  <li key={`${ev.id}:${s.id}`} className={`grid grid-cols-[4.5rem_1fr_auto_1fr_minmax(0,14rem)] items-center gap-3 px-4 py-2.5 text-sm ${mine ? 'bg-accent/10' : ''}`}>
                    <span className={`text-xs font-bold ${mine ? 'text-loss' : 'text-muted'}`}>{mine ? '● AO VIVO' : s.format.replace('MD', 'BO')}</span>
                    <span className="flex items-center justify-end gap-2 truncate font-semibold">
                      {w.teams[s.teamAId]?.name}
                      <TeamBadge team={w.teams[s.teamAId]} size={20} />
                    </span>
                    <span className="text-xs text-muted">vs</span>
                    <span className="flex items-center gap-2 truncate font-semibold">
                      <TeamBadge team={w.teams[s.teamBId]} size={20} />
                      {w.teams[s.teamBId]?.name}
                    </span>
                    <span className="truncate text-right text-xs text-muted">{ev.name}</span>
                  </li>
                );
              })}
          </DayBlock>
        ))
      ) : (
        <p className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">Nenhuma partida marcada agora.</p>
      )}
      {upcoming.length > 0 && (
        <DayBlock title="Próximos eventos">
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-28 text-xs text-muted">{formatDate(e.startDate)}</span>
              <span className="flex-1 truncate font-semibold">{e.name}</span>
              <span className="text-xs text-muted">em {Math.max(0, daysBetween(w.date, e.startDate))} dias</span>
            </li>
          ))}
        </DayBlock>
      )}
    </div>
  );
}

function Results() {
  const w = useWorld();
  const me = w.managerTeamId;
  const stored = useGame((s) => s.seriesResults);
  const [open, setOpen] = useState<string | null>(null);
  const evName = (id?: string) => w.calendar.find((e) => e.id === id)?.name ?? '';
  const log = [...w.seriesLog].reverse();
  const dates = [...new Set(log.map((s) => s.date))];
  const opened = open ? stored[open] : null;
  if (opened)
    return (
      <div className="space-y-3">
        <button className="text-sm text-muted hover:text-ink" onClick={() => setOpen(null)}>
          ‹ Voltar aos resultados
        </button>
        <MatchView result={opened} />
      </div>
    );
  if (!log.length) return <p className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">Nenhum resultado ainda. Avance os dias.</p>;
  return (
    <div className="space-y-4">
      {dates.map((d) => (
        <DayBlock key={d} title={`Resultados de ${formatDate(d)}`}>
          {log
            .filter((s) => s.date === d)
            .map((s, k) => {
              const mine = s.winner === me || s.loser === me;
              const canOpen = !!(s.matchId && stored[s.matchId]);
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => s.matchId && setOpen(s.matchId)}
                    className={`grid w-full grid-cols-[1fr_4.5rem_1fr_minmax(0,14rem)_3rem] items-center gap-3 px-4 py-2.5 text-left text-sm ${mine ? 'bg-accent/10' : ''} ${canOpen ? 'hover:bg-white/5' : ''}`}
                  >
                    <span className="flex items-center justify-end gap-2 truncate font-bold">
                      {w.teams[s.winner]?.name ?? s.winner}
                      <TeamBadge team={w.teams[s.winner]} size={20} />
                    </span>
                    <span className="text-center font-bold tabular-nums">
                      <span className="text-win">{s.score?.[0] ?? '–'}</span> <span className="text-muted">-</span> <span className="text-loss">{s.score?.[1] ?? '–'}</span>
                    </span>
                    <span className="flex items-center gap-2 truncate text-muted">
                      <TeamBadge team={w.teams[s.loser]} size={20} />
                      {w.teams[s.loser]?.name ?? s.loser}
                    </span>
                    <span className="truncate text-right text-xs text-muted">{evName(s.eventId)}</span>
                    <span className="text-right text-[11px] text-muted">{(s.format ?? '').replace('MD', 'BO')}</span>
                  </button>
                </li>
              );
            })}
        </DayBlock>
      ))}
      <p className="text-xs text-muted">Os jogos do seu time abrem com o placar completo; os outros mostram só o resultado.</p>
    </div>
  );
}

function Events() {
  const w = useWorld();
  const me = w.managerTeamId;
  const [open, setOpen] = useState<string | null>(null);
  const opened = w.calendar.find((e) => e.id === open);
  if (opened) return <EventPanel ev={opened} onBack={() => setOpen(null)} />;
  const groups: Array<[string, CalendarEvent[]]> = [
    ['Em andamento', w.calendar.filter((e) => e.status === 'em_andamento')],
    ['Próximos', w.calendar.filter((e) => e.status === 'futuro' || e.status === 'convites')],
    ['Encerrados', w.calendar.filter((e) => e.status === 'encerrado').reverse()],
  ];
  return (
    <div className="space-y-4">
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <DayBlock key={title} title={title}>
            {list.map((e) => {
              const champ = e.tournament?.championId ? w.teams[e.tournament.championId] : null;
              const mine = e.accepted.includes(me) || e.qualified.includes(me) || !!e.tournament?.participants.includes(me);
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => setOpen(e.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/5 ${mine ? 'bg-accent/10' : ''}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.name}</span>
                      <span className="block text-xs text-muted">
                        {formatDate(e.startDate)} – {formatDate(e.endDate)} · {e.city}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{e.teams} times</span>
                    <span className="text-xs text-muted">{money(e.prizePool)}</span>
                    <span className="flex items-center justify-end gap-2 truncate text-xs">
                      {champ ? (
                        <>
                          🏆 <TeamBadge team={champ} size={16} /> {champ.shortName}
                        </>
                      ) : e.status === 'encerrado' ? (
                        <span className="text-muted">cancelado</span>
                      ) : mine ? (
                        <span className="text-accent">seu time</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </DayBlock>
        ))}
    </div>
  );
}

export function HltvHub() {
  const [tab, setTab] = useState<HubTab>('partidas');
  return (
    <div>
      <SubTabs<HubTab>
        tabs={[
          { id: 'partidas', label: 'Partidas' },
          { id: 'resultados', label: 'Resultados' },
          { id: 'eventos', label: 'Eventos' },
          { id: 'ranking', label: 'Ranking' },
          { id: 'noticias', label: 'Notícias' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'partidas' ? <Matches /> : tab === 'resultados' ? <Results /> : tab === 'eventos' ? <Events /> : tab === 'ranking' ? <RankingPanel /> : <NewsPanel />}
    </div>
  );
}
