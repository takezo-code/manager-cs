import { useEffect, useRef, useState } from 'react';
import { DE_SLOTS } from '../engine/tournament/doubleElim';
import { TEMPLATES, allSeries } from '../engine/tournament/run';
import { buchholz, isActive, swissStandings } from '../engine/tournament/swiss';
import type { BracketStage, DoubleElimGroup, Series, Stage, SwissStage, Tournament, TournamentTemplate } from '../engine/tournament/types';
import type { Team } from '../engine/types';
import { useGame } from '../store/game';
import { MatchView } from './MatchView';
import { TeamBadge } from './TeamBadge';

function TournamentStart() {
  const start = useGame((s) => s.startTournament);
  const myTeam = useGame((s) => s.teams[s.myTeamId!]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(TEMPLATES) as TournamentTemplate[]).map((k) => {
        const info = TEMPLATES[k];
        const invited = myTeam.hltvRank <= info.teams;
        return (
          <div key={k} className="flex flex-col rounded-2xl border border-line bg-panel p-5">
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">{k === 'major' ? 'Major' : 'Intel Extreme Masters'}</p>
            <h2 className="font-display mt-1 text-2xl font-bold">{info.name}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{info.description}</p>
            <p className={`mt-3 text-sm ${invited ? 'text-win' : 'text-loss'}`}>
              {invited
                ? `${myTeam.shortName} está convidado (top ${info.teams} do ranking).`
                : `${myTeam.shortName} não foi convidado (só o top ${info.teams}). Você acompanha de fora.`}
            </p>
            <button
              type="button"
              onClick={() => start(k)}
              className="mt-4 self-start rounded-lg bg-accent px-5 py-2 font-semibold text-black transition hover:brightness-110"
            >
              Começar campeonato
            </button>
          </div>
        );
      })}
    </div>
  );
}

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

function GroupView({ g, teams, myTeamId, open, can }: { g: DoubleElimGroup; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const upper = DE_SLOTS.filter((k) => k.startsWith('U')).map((k) => g.matches[k]);
  const lower = DE_SLOTS.filter((k) => !k.startsWith('U')).map((k) => g.matches[k]);
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
  const columns = ['Quartas de final', 'Semifinal', 'Grande final'];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((c) => (
        <div key={c} className="flex flex-col justify-around gap-2">
          <h4 className="text-xs font-semibold tracking-wider text-muted uppercase">{c}</h4>
          {b.slots
            .filter((s) => s.label === c)
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

function myStatus(t: Tournament, myTeamId: string, teams: Record<string, Team>): string {
  if (!t.participants.includes(myTeamId)) return `${teams[myTeamId].shortName} não foi convidado. Você está acompanhando de fora.`;
  const place = t.placements[myTeamId];
  if (place === 'Campeão') return `${teams[myTeamId].shortName} é CAMPEÃO!`;
  if (place) return `${teams[myTeamId].shortName} terminou em ${place}.`;
  return `${teams[myTeamId].shortName} segue na disputa.`;
}

export function TournamentPanel() {
  const t = useGame((s) => s.tournament);
  const teams = useGame((s) => s.teams);
  const myTeamId = useGame((s) => s.myTeamId)!;
  const results = useGame((s) => s.seriesResults);
  const lastDayIds = useGame((s) => s.lastDayIds);
  const playNextDay = useGame((s) => s.playNextDay);
  const playToEnd = useGame((s) => s.playToEnd);
  const close = useGame((s) => s.closeTournament);
  const [stageView, setStageView] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => setStageView(null), [t?.stageIdx]);
  useEffect(() => {
    if (openId) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openId]);

  if (!t) return <TournamentStart />;

  const shownIdx = stageView ?? t.stageIdx;
  const series = allSeries(t);
  const lastDay = series.filter((m) => lastDayIds.includes(m.id));
  const can = (id: string) => !!results[id];
  const open = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  const champion = t.championId ? teams[t.championId] : null;
  const placementList = Object.entries(t.placements).sort(([, a], [, b]) => placeOrder(a) - placeOrder(b));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-3xl font-bold">{t.name}</h2>
            <p className="text-sm text-muted">
              Dia {t.day} · {t.stages[t.stageIdx].name} · {t.participants.length} times
            </p>
            <p className="mt-1 text-sm font-semibold">{myStatus(t, myTeamId, teams)}</p>
          </div>
          {!champion ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={playToEnd} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-ink">
                Simular até o fim
              </button>
              <button type="button" onClick={playNextDay} className="rounded-lg bg-accent px-5 py-2 font-semibold text-black transition hover:brightness-110">
                Jogar próximo dia
              </button>
            </div>
          ) : (
            <button type="button" onClick={close} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-ink">
              Encerrar campeonato
            </button>
          )}
        </div>

        {champion && (
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <TeamBadge team={champion} size={56} />
            <div>
              <p className="text-xs font-semibold tracking-wider text-accent uppercase">Campeão</p>
              <p className="font-display text-3xl font-bold">{champion.name}</p>
            </div>
          </div>
        )}
      </div>

      {lastDay.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display mb-3 text-xl font-bold">Jogos do dia {t.day}</h3>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {lastDay.map((m) => (
              <SeriesRow key={m.id} m={m} teams={teams} myTeamId={myTeamId} onOpen={open} canOpen={can(m.id)} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Clique num jogo para ver o placar completo. Os jogos do seu time ficam guardados; os outros, só até o dia seguinte.</p>
        </section>
      )}

      {openId && results[openId] && (
        <div ref={detailRef}>
          <MatchView key={openId} result={results[openId]} />
        </div>
      )}

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-4 flex flex-wrap gap-1">
          {t.stages.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setStageView(i)}
              className={`font-display rounded-lg px-3 py-1.5 font-bold transition ${i === shownIdx ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <StageView stage={t.stages[shownIdx]} teams={teams} myTeamId={myTeamId} open={open} can={can} />
      </section>

      {placementList.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display mb-3 text-xl font-bold">Colocações</h3>
          <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {placementList.map(([id, place]) => (
              <li key={id} className={`flex items-center gap-2 ${id === myTeamId ? 'text-accent' : ''}`}>
                <span className="w-20 shrink-0 text-muted tabular-nums">{place}</span>
                <TeamBadge team={teams[id]} size={18} />
                <span className="truncate font-semibold">{teams[id].name}</span>
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
