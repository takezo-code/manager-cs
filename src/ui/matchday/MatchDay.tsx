// Dia de jogo: pré-jogo, veto de mapas feito por você (pick/ban alternado com o rival) e o resultado.
import { useEffect, useMemo, useState } from 'react';
import { MAP_NAMES } from '../../engine/config';
import { playerOvr } from '../../engine/player';
import { myMatchToday } from '../../engine/schedule';
import { rivalPreview } from '../../engine/staff/preview';
import { withAcademyTeams } from '../../engine/tier2/model';
import { MAP_IDS, type MapId, type MatchResult, type VetoStep } from '../../engine/types';
import { aiVetoChoice, vetoSequence } from '../../engine/veto';
import { useGame, useWorld } from '../../store/game';
import { MatchView } from '../MatchView';
import { TeamBadge } from '../TeamBadge';
import { ROLE_LABEL } from '../format';

type Phase = 'pre' | 'veto';

/** Cor de cada mapa (só para diferenciar as cartas do veto). */
const MAP_TINT: Record<MapId, string> = {
  ancient: '#3ddc84',
  anubis: '#e8b04a',
  cache: '#9aa7ba',
  dust2: '#d9a066',
  inferno: '#ff6b3d',
  mirage: '#f2c14e',
  nuke: '#5b9dff',
};

function Lineup({ teamId, teams, align }: { teamId: string; teams: ReturnType<typeof withAcademyTeams>; align: 'left' | 'right' }) {
  const w = useWorld();
  const t = teams[teamId];
  return (
    <ul className={`space-y-1 text-sm ${align === 'right' ? 'text-right' : ''}`}>
      {t.starters.map((id) => {
        const p = w.players[id];
        if (!p) return null;
        return (
          <li key={id} className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
            <span className="font-display w-7 text-lg font-bold text-accent">{playerOvr(p)}</span>
            <span className="font-semibold">{p.nick}</span>
            <span className="text-xs text-muted">{ROLE_LABEL[p.role]}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Resultado da série do seu time, com o placar de cada mapa e o detalhe completo. */
function MatchDayResult({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const teams = withAcademyTeams(w, [result.teamAId, result.teamBId]);
  const won = result.winnerTeamId === me;
  const [a, b] = [result.teamAId, result.teamBId];
  return (
    <div className="space-y-4">
      <section className={`rounded-xl border p-6 text-center ${won ? 'border-win/50 bg-win/10' : 'border-loss/50 bg-loss/10'}`}>
        <p className={`font-display text-lg font-bold ${won ? 'text-win' : 'text-loss'}`}>{won ? 'Vitória' : 'Derrota'}</p>
        <div className="mt-3 flex items-center justify-center gap-6">
          <TeamBadge team={teams[a]} size={48} />
          <span className="font-display text-5xl font-bold tabular-nums">
            {result.mapScore[a]} <span className="text-muted">:</span> {result.mapScore[b]}
          </span>
          <TeamBadge team={teams[b]} size={48} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
          {result.maps.map((m) => (
            <span key={m.map} className="rounded-md bg-panel-2 px-3 py-1">
              {MAP_NAMES[m.map]} <b className="tabular-nums">{m.score[a]}–{m.score[b]}</b>
            </span>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 rounded-md bg-accent px-6 py-2 text-sm font-bold text-black hover:brightness-110">
          Voltar ao painel
        </button>
      </section>
      <MatchView result={result} />
    </div>
  );
}

export function MatchDay({ onClose }: { onClose: () => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const play = useGame((s) => s.playMatchDay);
  const result = useGame((s) => s.matchDayResult);
  const closeResult = useGame((s) => s.closeMatchDay);
  const match = useMemo(() => myMatchToday(w), [w]);
  const [phase, setPhase] = useState<Phase>('pre');
  const [steps, setSteps] = useState<VetoStep[]>([]);

  if (result)
    return (
      <MatchDayResult
        result={result}
        onClose={() => {
          closeResult();
          onClose();
        }}
      />
    );
  if (!match)
    return (
      <div className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">
        Seu time não joga amanhã.{' '}
        <button className="font-semibold text-accent" onClick={onClose}>
          Voltar ao painel
        </button>
      </div>
    );

  const teams = withAcademyTeams(w, [match.teamAId, match.teamBId]);
  const rivalId = match.teamAId === me ? match.teamBId : match.teamAId;
  const preview = rivalPreview(w, rivalId, match.seriesId);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-bold">Dia de jogo</h1>
          <span className="text-sm text-muted">
            {match.eventName} · {match.format} · {match.stage === 'grupos' ? 'fase de grupos' : match.stage === 'final' ? 'final' : 'playoffs'}
          </span>
        </div>
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-4">
            <TeamBadge team={teams[match.teamAId]} size={64} />
            <div>
              <p className={`font-display text-2xl font-bold ${match.teamAId === me ? 'text-accent' : ''}`}>{teams[match.teamAId].name}</p>
              <Lineup teamId={match.teamAId} teams={teams} align="left" />
            </div>
          </div>
          <span className="font-display text-center text-4xl font-bold text-muted">VS</span>
          <div className="flex flex-row-reverse items-center gap-4 text-right">
            <TeamBadge team={teams[match.teamBId]} size={64} />
            <div>
              <p className={`font-display text-2xl font-bold ${match.teamBId === me ? 'text-accent' : ''}`}>{teams[match.teamBId].name}</p>
              <Lineup teamId={match.teamBId} teams={teams} align="right" />
            </div>
          </div>
        </div>
      </section>

      {phase === 'pre' ? (
        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="font-display mb-2 text-lg font-bold">Leitura do analista</h2>
          <p className="text-sm text-muted">
            Mapas fortes do rival: <b className="text-loss">{preview.strong.map((m) => MAP_NAMES[m]).join(', ')}</b>. Mapas fracos:{' '}
            <b className="text-win">{preview.weak.map((m) => MAP_NAMES[m]).join(', ')}</b>.
          </p>
          <p className="mt-1 text-sm text-muted">
            {match.teamAId === me ? 'Seu time tem o melhor seed e começa o veto.' : 'O rival tem o melhor seed e começa o veto.'}{' '}
            {match.format === 'MD1' ? 'MD1: só bans; o mapa que sobrar é jogado.' : 'Bane, escolhe e o mapa que sobrar é o decider.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setPhase('veto')} className="rounded-md bg-accent px-5 py-2 text-sm font-bold text-black hover:brightness-110">
              Fazer o veto
            </button>
            <button onClick={() => play(null)} className="rounded-md bg-panel-2 px-5 py-2 text-sm font-semibold hover:bg-white/10">
              Deixar o técnico decidir e jogar
            </button>
            <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:text-ink">
              Voltar ao painel
            </button>
          </div>
        </section>
      ) : (
        <VetoBoard
          match={match}
          me={me}
          teams={teams}
          strong={preview.strong}
          weak={preview.weak}
          steps={steps}
          setSteps={setSteps}
          onPlay={(veto) => play(veto)}
        />
      )}
    </div>
  );
}

function VetoBoard({
  match,
  me,
  teams,
  strong,
  weak,
  steps,
  setSteps,
  onPlay,
}: {
  match: NonNullable<ReturnType<typeof myMatchToday>>;
  me: string;
  teams: ReturnType<typeof withAcademyTeams>;
  strong: MapId[];
  weak: MapId[];
  steps: VetoStep[];
  setSteps: (s: VetoStep[]) => void;
  onPlay: (veto: VetoStep[]) => void;
}) {
  const seq = vetoSequence(match.format);
  const done = steps.length >= seq.length;
  const used = new Set(steps.map((s) => s.map));
  const remaining = MAP_IDS.filter((m) => !used.has(m));
  const current = done ? null : seq[steps.length];
  const currentTeam = current ? (current.team === 0 ? match.teamAId : match.teamBId) : null;
  const myTurn = currentTeam === me;
  const rivalId = match.teamAId === me ? match.teamBId : match.teamAId;
  const decider = done ? remaining[0] : null;

  // Vez do rival: escolhe sozinho depois de um instante (para dar para acompanhar).
  useEffect(() => {
    if (!current || myTurn) return;
    const t = setTimeout(() => {
      const map = aiVetoChoice(teams[rivalId], teams[me], current.action, remaining);
      setSteps([...steps, { teamId: rivalId, action: current.action, map }]);
    }, 700);
    return () => clearTimeout(t);
  }, [current, myTurn, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (map: MapId) => {
    if (!current || !myTurn || used.has(map)) return;
    setSteps([...steps, { teamId: me, action: current.action, map }]);
  };
  const final: VetoStep[] | null = done ? [...steps, { teamId: null, action: 'decider', map: decider! }] : null;

  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Veto de mapas</h2>
        <p className={`text-sm font-semibold ${done ? 'text-win' : myTurn ? 'text-accent' : 'text-muted'}`}>
          {done
            ? `Decider: ${MAP_NAMES[decider!]}. Tudo pronto.`
            : myTurn
              ? current!.action === 'ban'
                ? 'Sua vez: clique no mapa que quer banir.'
                : 'Sua vez: clique no mapa que quer jogar.'
              : `${teams[rivalId].name} está ${current!.action === 'ban' ? 'banindo' : 'escolhendo'}…`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {MAP_IDS.map((m) => {
          const step = steps.find((s) => s.map === m);
          const isDecider = decider === m;
          const banned = step?.action === 'ban';
          const picked = step?.action === 'pick';
          const byMe = step?.teamId === me;
          const selectable = myTurn && !step;
          return (
            <button
              key={m}
              type="button"
              disabled={!selectable}
              onClick={() => choose(m)}
              style={{ backgroundImage: `linear-gradient(160deg, ${MAP_TINT[m]}33, transparent 65%)` }}
              className={`relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-lg border p-3 text-left transition ${
                banned
                  ? 'border-line bg-black/40 opacity-45'
                  : picked || isDecider
                    ? `border-2 ${byMe ? 'border-accent' : isDecider ? 'border-ink' : 'border-ct'} bg-panel-2`
                    : selectable
                      ? `border-line bg-panel-2 hover:-translate-y-0.5 ${current!.action === 'ban' ? 'hover:border-loss' : 'hover:border-win'}`
                      : 'border-line bg-panel-2'
              }`}
            >
              <span className="flex gap-1 text-[10px] font-semibold">
                {strong.includes(m) && <span className="rounded bg-loss/20 px-1.5 py-0.5 text-loss">forte do rival</span>}
                {weak.includes(m) && <span className="rounded bg-win/20 px-1.5 py-0.5 text-win">fraco do rival</span>}
              </span>
              <span>
                <span className={`font-display block text-2xl leading-none font-bold ${banned ? 'line-through' : ''}`}>{MAP_NAMES[m]}</span>
                <span className="mt-1 block text-xs text-muted">Seu time: {teams[me].mapStrength[m]}</span>
                <span className={`mt-2 block text-xs font-bold ${banned ? 'text-loss' : picked ? (byMe ? 'text-accent' : 'text-ct') : isDecider ? 'text-ink' : 'text-transparent'}`}>
                  {banned ? `Ban ${teams[step!.teamId!].shortName}` : picked ? `Pick ${teams[step!.teamId!].shortName}` : isDecider ? 'Decider' : '·'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          disabled={!final}
          onClick={() => final && onPlay(final)}
          className="rounded-md bg-win px-6 py-2 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-30"
        >
          Jogar a série
        </button>
        <button disabled={!steps.length} onClick={() => setSteps([])} className="rounded-md px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-30">
          Recomeçar o veto
        </button>
      </div>
    </section>
  );
}
