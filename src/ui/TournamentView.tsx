import { useEffect, useRef, useState } from 'react';
import { DE_SLOTS } from '../engine/tournament/doubleElim';
import { buchholz, isActive, swissStandings } from '../engine/tournament/swiss';
import type { CalendarEvent } from '../engine/calendar';
import { formatDate } from '../engine/date';
import { prizeFor } from '../engine/finance/prizes';
import { pickAwards } from '../engine/tournament/awards';
import { allSeries } from '../engine/tournament/run';
import type { BracketStage, FormatId, Group, Series, Stage, SwissStage } from '../engine/tournament/types';
import { money } from './format';

export const FORMAT_LABEL: Record<FormatId, string> = {
  major32: '32 times, 3 fases suíças e playoffs com 8',
  groups16: '16 times, 2 grupos de dupla eliminação e playoffs com 6',
  swiss16: '16 times, fase suíça e playoffs com 8',
  epl24: '24 times, 2 fases suíças e playoffs com 8',
  ewc32: '32 times, 4 grupos de dupla eliminação e playoffs com 16',
  rivals8: '8 times, 2 grupos GSL e playoffs com 6',
  bracket8: '8 times em mata-mata',
};
import type { Team } from '../engine/types';
import { useGame, useWorld } from '../store/game';
import { MatchView } from './MatchView';
import { TeamBadge } from './TeamBadge';

function SeriesRow({
  m,
  teams,
  myTeamId,
  onOpen,
  canOpen,
  compact,
}: {
  m: Series;
  teams: Record<string, Team>;
  myTeamId: string;
  onOpen: (id: string) => void;
  canOpen: boolean;
  compact?: boolean;
}) {
  const a = teams[m.teamAId];
  const b = teams[m.teamBId];
  const mine = m.teamAId === myTeamId || m.teamBId === myTeamId;
  const side = (t: Team, score: number | undefined, right?: boolean) => {
    const won = m.winnerId === t.id;
    const lost = m.winnerId && !won;
    return (
      <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
        <TeamBadge team={t} size={compact ? 22 : 26} />
        <span className={`truncate text-sm font-semibold ${lost ? 'text-muted' : ''} ${t.id === myTeamId ? 'text-accent' : ''}`}>{t.shortName}</span>
        <span className={`font-display ml-auto text-lg font-bold tabular-nums ${right ? 'mr-auto ml-0' : ''} ${won ? 'text-win' : 'text-muted'}`}>
          {score ?? '–'}
        </span>
      </div>
    );
  };
  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => onOpen(m.id)}
      className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition ${
        mine ? 'border-accent/50 bg-accent/5' : 'border-line bg-panel-2/40'
      } ${canOpen ? 'hover:border-white/40' : 'cursor-default'}`}
    >
      {!compact && (
        <div className="mb-0.5 flex justify-between text-[11px] text-muted">
          <span className="truncate">{m.label.split(' · ').slice(1).join(' · ')}</span>
          <span className="shrink-0 pl-2">{m.format}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {side(a, m.score?.[0])}
        <span className="text-xs text-muted">×</span>
        {side(b, m.score?.[1], true)}
      </div>
      {m.maps && !compact && (
        <div className="mt-0.5 text-center text-[11px] text-muted tabular-nums">{m.maps.map((x) => `${x.a}-${x.b}`).join(' · ')}</div>
      )}
    </button>
  );
}

function SwissView({ s, teams, myTeamId, open, can }: { s: SwissStage; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const standings = swissStandings(s);
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-2 py-2 text-left font-medium">#</th>
              <th className="text-left font-medium">Time</th>
              <th className="text-right font-medium">V-D</th>
              <th className="px-2 text-right font-medium" title="Buchholz: soma do saldo dos adversários">Buch.</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((id, i) => {
              const r = s.records[id];
              const status = r.w >= 3 ? 'text-win' : r.l >= 3 ? 'text-loss' : '';
              return (
                <tr key={id} className={`border-t border-line/60 ${id === myTeamId ? 'bg-accent/10' : ''}`}>
                  <td className="px-2 py-1.5 text-muted tabular-nums">{i + 1}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <TeamBadge team={teams[id]} size={20} />
                      <span className={`truncate font-semibold ${status}`}>{teams[id].shortName}</span>
                    </span>
                  </td>
                  <td className={`text-right font-semibold tabular-nums ${status}`}>
                    {r.w}-{r.l}
                  </td>
                  <td className="px-2 text-right text-muted tabular-nums">{buchholz(s, id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          <span className="text-win">Verde</span>: classificado · <span className="text-loss">vermelho</span>: eliminado ·{' '}
          {s.seeds.filter((id) => isActive(s, id)).length} na disputa
        </p>
      </div>
      <div className="space-y-4">
        {[...s.rounds].reverse().map((round, ri) => (
          <div key={ri}>
            <h4 className="mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Rodada {s.rounds.length - ri}</h4>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {round.map((m) => (
                <SeriesRow key={m.id} m={m} teams={teams} myTeamId={myTeamId} onOpen={open} canOpen={can(m.id)} />
              ))}
            </div>
          </div>
        ))}
        {!s.rounds.length && <p className="text-sm text-muted">A primeira rodada sai quando você jogar o próximo dia.</p>}
      </div>
    </div>
  );
}

function GroupView({ g, teams, myTeamId, open, can }: { g: Group; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const upper = g.kind === 'de8' ? DE_SLOTS.filter((k) => k.startsWith('U')).map((k) => g.matches[k]) : (['O1', 'O2', 'W'] as const).map((k) => g.matches[k]);
  const lower = g.kind === 'de8' ? DE_SLOTS.filter((k) => !k.startsWith('U')).map((k) => g.matches[k]) : (['L', 'D'] as const).map((k) => g.matches[k]);
  const col = (title: string, ms: (Series | undefined)[]) => (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold tracking-wider text-muted uppercase">{title}</h4>
      {ms.some(Boolean) ? (
        ms.map((m) => m && <SeriesRow key={m.id} m={m} teams={teams} myTeamId={myTeamId} onOpen={open} canOpen={can(m.id)} />)
      ) : (
        <p className="text-sm text-muted">Ainda sem jogos.</p>
      )}
    </div>
  );
  return (
    <div className="rounded-xl border border-line p-3">
      <h3 className="font-display mb-2 text-xl font-bold">{g.name}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {col('Upper bracket', upper)}
        {col('Lower bracket', lower)}
      </div>
    </div>
  );
}

function BracketView({ b, teams, myTeamId, open, can }: { b: BracketStage; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const col = (label: string) => (label === 'Disputa de 3º lugar' ? 'Grande final' : label);
  const columns = [...new Set(b.slots.map((x) => col(x.label)))];
  return (
    <div className="grid gap-4 md:auto-cols-fr md:grid-flow-col">
      {columns.map((c) => (
        <div key={c} className="flex flex-col justify-around gap-2">
          <h4 className="text-xs font-semibold tracking-wider text-muted uppercase">{c}</h4>
          {b.slots
            .filter((s) => col(s.label) === c)
            .map((slot) =>
              slot.series ? (
                <SeriesRow key={slot.id} m={slot.series} teams={teams} myTeamId={myTeamId} onOpen={open} canOpen={can(slot.series.id)} />
              ) : (
                <div key={slot.id} className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
                  {'team' in slot.a ? teams[slot.a.team].shortName : 'A definir'} × {'team' in slot.b ? teams[slot.b.team].shortName : 'A definir'}
                </div>
              ),
            )}
        </div>
      ))}
    </div>
  );
}

function StageView(props: { stage: Stage; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const { stage } = props;
  if (stage.kind === 'swiss') return <SwissView s={stage} {...props} />;
  if (stage.kind === 'groups')
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {stage.groups.map((g) => (
          <GroupView key={g.name} g={g} {...props} />
        ))}
      </div>
    );
  return <BracketView b={stage} {...props} />;
}

function myStatus(ev: CalendarEvent, myTeamId: string): string {
  const t = ev.tournament;
  if (!t) {
    if (ev.accepted.includes(myTeamId) || ev.qualified.includes(myTeamId)) return 'Seu time está confirmado.';
    if (ev.invited.includes(myTeamId) && !ev.declined.includes(myTeamId)) return 'Seu time foi convidado: responda na aba Mensagens.';
    return ev.status === 'futuro' ? 'Os convites saem 21 dias antes do evento.' : 'Seu time não está neste evento.';
  }
  if (!t.participants.includes(myTeamId)) return 'Seu time não está neste evento.';
  const place = t.placements[myTeamId];
  if (place === 'Campeão') return 'Seu time é campeão!';
  if (place) return `Seu time terminou em ${place}.`;
  return 'Seu time segue na disputa.';
}

/** Detalhe de um evento do calendário: chaves, jogos do último dia, colocações e prêmios. */
export function EventPanel({ ev, onBack }: { ev: CalendarEvent; onBack: () => void }) {
  const world = useWorld();
  const teams = world.teams;
  const players = useGame((s) => s.players);
  const myTeamId = useGame((s) => s.myTeamId)!;
  const results = useGame((s) => s.seriesResults);
  const lastDayIds = useGame((s) => s.lastDayIds);
  const t = ev.tournament;
  const [stageView, setStageView] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => setStageView(null), [t?.stageIdx]);
  useEffect(() => {
    if (openId) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openId]);

  const series = t ? allSeries(t) : [];
  const lastDay = series.filter((m) => lastDayIds.includes(m.id));
  const can = (id: string) => !!results[id];
  const open = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  const champion = t?.championId ? teams[t.championId] : null;
  const placementList = t ? Object.entries(t.placements).sort(([, a], [, b]) => placeOrder(a) - placeOrder(b)) : [];
  const awards = t?.championId ? pickAwards(t) : null;
  const shownIdx = stageView ?? t?.stageIdx ?? 0;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
        ‹ Voltar ao calendário
      </button>
      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-3xl font-bold">{ev.name}</h2>
        <p className="text-sm text-muted">
          {ev.city && `${ev.city}, `}
          {formatDate(ev.startDate)} a {formatDate(ev.endDate)}. {FORMAT_LABEL[ev.format]}. Prêmio total {money(ev.prizePool)}
          {ev.approximated && ' (formato aproximado)'}.
        </p>
        <p className="mt-1 text-sm font-semibold">{myStatus(ev, myTeamId)}</p>
        {champion && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <TeamBadge team={champion} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-accent">Campeão</p>
              <p className="font-display text-3xl font-bold">{champion.name}</p>
            </div>
            {awards?.mvp && (
              <div className="text-right">
                <p className="text-sm text-accent">MVP</p>
                <p className="font-display text-2xl font-bold">{players[awards.mvp]?.nick ?? awards.mvp}</p>
                {awards.evps.length > 0 && <p className="text-xs text-muted">EVPs: {awards.evps.map((id) => players[id]?.nick ?? id).join(', ')}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {!t && (
        <section className="rounded-2xl border border-line bg-panel p-5 text-sm">
          <h3 className="font-display mb-2 text-xl font-bold">Participantes</h3>
          {ev.accepted.length + ev.qualified.length === 0 ? (
            <p className="text-muted">Ainda sem confirmados.</p>
          ) : (
            <p>{[...ev.accepted, ...ev.qualified].map((id) => teams[id].shortName).join(', ')}</p>
          )}
          {ev.qualifierSlots > 0 && <p className="mt-2 text-muted">{ev.qualifierSlots} vagas saem da qualificatória, 3 dias antes do evento.</p>}
        </section>
      )}

      {lastDay.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display mb-3 text-xl font-bold">Jogos do último dia</h3>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {lastDay.map((m) => (
              <SeriesRow key={m.id} m={m} teams={teams} myTeamId={myTeamId} onOpen={open} canOpen={can(m.id)} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Clique num jogo para ver o placar completo. Os jogos do seu time ficam guardados; os outros, só até o próximo dia.</p>
        </section>
      )}

      {openId && results[openId] && (
        <div ref={detailRef}>
          <MatchView key={openId} result={results[openId]} />
        </div>
      )}

      {t && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-4 flex flex-wrap gap-1">
            {t.stages.map((st, i) => (
              <button
                key={st.name}
                type="button"
                onClick={() => setStageView(i)}
                className={`font-display rounded-lg px-3 py-1.5 font-bold transition ${i === shownIdx ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
              >
                {st.name}
              </button>
            ))}
          </div>
          <StageView stage={t.stages[shownIdx]} teams={teams} myTeamId={myTeamId} open={open} can={can} />
        </section>
      )}

      {t && placementList.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display mb-3 text-xl font-bold">Colocações e prêmios</h3>
          <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {placementList.map(([id, place]) => (
              <li key={id} className={`flex items-center gap-2 ${id === myTeamId ? 'text-accent' : ''}`}>
                <span className="w-16 shrink-0 text-muted tabular-nums">{place}</span>
                <TeamBadge team={teams[id]} size={18} />
                <span className="min-w-0 flex-1 truncate font-semibold">{teams[id].name}</span>
                <span className="text-muted tabular-nums">{money(prizeFor(t, place))}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function placeOrder(p: string): number {
  if (p === 'Campeão') return 1;
  if (p === 'Vice') return 2;
  return parseInt(p, 10) || 99;
}
