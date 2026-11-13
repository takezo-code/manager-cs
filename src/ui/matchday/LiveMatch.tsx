// Partida ao vivo (estilo scorebot): os rounds passam sozinhos, com kill feed, placar e K/D dos jogadores.
import { useEffect, useMemo, useState } from 'react';
import { MAP_NAMES } from '../../engine/config';
import type { MatchResult, RoundEvent } from '../../engine/types';
import { useWorld } from '../../store/game';
import { TeamBadge } from '../TeamBadge';

type Step = { map: number; round: number; event: number }; // event = -1: início do round; = events.length: fim do round

const REASON: Record<string, string> = { eliminacao: 'eliminação', bomba: 'bomba explodiu', defuse: 'bomba desarmada', tempo: 'tempo esgotado' };
const SPEEDS = [1, 2, 4] as const;

/** Linha do tempo: para cada round, o início, cada evento e o fim. */
function buildSteps(r: MatchResult): Step[] {
  const out: Step[] = [];
  r.maps.forEach((m, mi) =>
    m.rounds.forEach((rd, ri) => {
      out.push({ map: mi, round: ri, event: -1 });
      (rd.events ?? []).forEach((_, ei) => out.push({ map: mi, round: ri, event: ei }));
      out.push({ map: mi, round: ri, event: (rd.events ?? []).length });
    }),
  );
  return out;
}

export function LiveMatch({ result, onFinish }: { result: MatchResult; onFinish: () => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const steps = useMemo(() => buildSteps(result), [result]);
  const [i, setI] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [paused, setPaused] = useState(false);
  const done = i >= steps.length - 1;
  const step = steps[Math.min(i, steps.length - 1)];
  const map = result.maps[step.map];
  const round = map.rounds[step.round];
  const events = round.events ?? [];
  const [a, b] = [result.teamAId, result.teamBId];
  const teamA = w.teams[a];
  const teamB = w.teams[b];
  const nick = (id: string) => w.players[id]?.nick ?? id;
  const lineup = (t: string) => result.lineups?.[t] ?? Object.keys(map.stats).filter((id) => w.players[id]?.teamId === t);

  // Avança sozinho: eventos rápidos, pausa maior no fim do round e na troca de mapa.
  useEffect(() => {
    if (paused || done) return;
    const end = step.event === events.length;
    const lastOfMap = end && step.round === map.rounds.length - 1;
    const ms = (lastOfMap ? 2600 : end ? 1300 : step.event === -1 ? 500 : 650) / speed;
    const t = setTimeout(() => setI((x) => x + 1), ms);
    return () => clearTimeout(t);
  }, [i, paused, done, speed, step, events.length, map.rounds.length]);

  // Placar e K/D até o passo atual.
  const roundsDone = map.rounds.slice(0, step.round + (step.event === events.length ? 1 : 0));
  const score = roundsDone.length ? roundsDone[roundsDone.length - 1].scoreAfter : { [a]: 0, [b]: 0 };
  const mapsWon = (t: string) => result.maps.slice(0, step.map).filter((m) => m.score[t] > m.score[t === a ? b : a]).length;
  const kd: Record<string, { k: number; d: number }> = {};
  const seen = (ri: number, ei: number) => ri < step.round || (ri === step.round && ei <= step.event);
  map.rounds.forEach((rd, ri) =>
    (rd.events ?? []).forEach((e, ei) => {
      if (e.kind !== 'kill' || !seen(ri, ei)) return;
      (kd[e.killer] ??= { k: 0, d: 0 }).k++;
      (kd[e.victim] ??= { k: 0, d: 0 }).d++;
    }),
  );
  const shown = events.slice(0, Math.max(0, step.event + 1));
  const deadNow = new Set(shown.filter((e) => e.kind === 'kill').map((e) => (e.kind === 'kill' ? e.victim : '')));
  const weaponNow: Record<string, string> = {};
  for (const e of shown) if (e.kind === 'kill') weaponNow[e.killer] = e.weapon;
  const sideOf = (t: string) => (round.ctTeamId === t ? 'CT' : 'TR');
  const sideColor = (t: string) => (round.ctTeamId === t ? 'text-ct' : 'text-tr');
  const teamOfPlayer = (id: string) => (lineup(a).includes(id) ? a : b);

  const skipTo = (pred: (s: Step) => boolean) => {
    const j = steps.findIndex((s, k) => k > i && pred(s));
    setI(j < 0 ? steps.length - 1 : j);
  };

  const Feed = ({ e }: { e: RoundEvent }) => {
    if (e.kind === 'plant') return <li className="text-tr">💣 {nick(e.by)} plantou a bomba</li>;
    if (e.kind === 'defuse') return <li className="text-ct">✂ {nick(e.by)} desarmou a bomba</li>;
    const kt = teamOfPlayer(e.killer);
    return (
      <li className="flex flex-wrap items-center gap-1.5">
        <span className={`font-semibold ${sideColor(kt)}`}>{nick(e.killer)}</span>
        <span className="rounded-sm bg-white/10 px-1.5 text-[11px] text-muted">
          {e.weapon}
          {e.headshot && ' · HS'}
        </span>
        <span className={`font-semibold ${sideColor(kt === a ? b : a)}`}>{nick(e.victim)}</span>
        {e.trade && <span className="text-[11px] text-muted">(trade)</span>}
      </li>
    );
  };

  const Players = ({ t }: { t: string }) => (
    <ul className="divide-y divide-white/5">
      {lineup(t).map((id) => {
        const dead = deadNow.has(id) && step.event < events.length;
        const s = kd[id] ?? { k: 0, d: 0 };
        return (
          <li key={id} className={`flex items-center gap-2 px-3 py-2 text-sm transition ${dead ? 'opacity-35' : ''}`}>
            <span className={`h-2 w-2 rounded-full ${dead ? 'bg-loss' : 'bg-win'}`} />
            <span className="min-w-0 flex-1 truncate font-semibold">{nick(id)}</span>
            <span className="w-16 truncate text-right text-[11px] text-muted">{weaponNow[id] ?? ''}</span>
            <span className="w-14 text-right tabular-nums">
              {s.k}-{s.d}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-3">
      {/* Placar */}
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted uppercase">
          <span>
            Mapa {step.map + 1} de {result.maps.length} · {MAP_NAMES[map.map]}
          </span>
          <span className="flex items-center gap-1.5 text-loss">
            <span className="h-2 w-2 animate-pulse rounded-full bg-loss" /> Ao vivo · round {round.number}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center justify-end gap-3 text-right">
            <div>
              <p className={`font-display text-xl font-bold uppercase ${a === me ? 'text-accent' : ''}`}>{teamA.name}</p>
              <p className={`text-xs font-bold ${sideColor(a)}`}>
                {sideOf(a)} · mapas {mapsWon(a)}
              </p>
            </div>
            <TeamBadge team={teamA} size={48} />
          </div>
          <div className="font-display text-5xl font-bold tabular-nums">
            {score[a] ?? 0}
            <span className="mx-2 text-muted">:</span>
            {score[b] ?? 0}
          </div>
          <div className="flex items-center gap-3">
            <TeamBadge team={teamB} size={48} />
            <div>
              <p className={`font-display text-xl font-bold uppercase ${b === me ? 'text-accent' : ''}`}>{teamB.name}</p>
              <p className={`text-xs font-bold ${sideColor(b)}`}>
                {sideOf(b)} · mapas {mapsWon(b)}
              </p>
            </div>
          </div>
        </div>
        {/* Histórico de rounds do mapa */}
        <div className="mt-3 flex flex-wrap justify-center gap-0.5">
          {map.rounds.map((rd, ri) => {
            const past = ri < step.round || (ri === step.round && step.event === events.length);
            const won = rd.winnerTeamId;
            return (
              <span
                key={ri}
                title={past ? `Round ${rd.number}: ${w.teams[won]?.shortName} (${REASON[rd.reason]})` : undefined}
                className={`h-3 w-3 rounded-[2px] ${!past ? 'bg-white/10' : won === a ? 'bg-accent' : 'bg-ct'} ${ri === step.round ? 'ring-1 ring-ink' : ''}`}
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr_1fr]">
        <section className="rounded-md border border-white/10 bg-panel">
          <h3 className={`font-display border-b border-white/10 px-3 py-2 text-xs font-bold tracking-wider uppercase ${sideColor(a)}`}>{teamA.shortName}</h3>
          <Players t={a} />
        </section>

        <section className="flex flex-col rounded-md border border-white/10 bg-panel">
          <h3 className="font-display border-b border-white/10 px-3 py-2 text-xs font-bold tracking-wider uppercase">Round {round.number}</h3>
          <ul className="min-h-56 flex-1 space-y-1.5 px-3 py-2 text-sm">
            {step.event === -1 && (
              <li className="text-muted">
                Compras: {teamA.shortName} {round.buys[a]} · {teamB.shortName} {round.buys[b]}
              </li>
            )}
            {shown.map((e, k) => (
              <Feed key={k} e={e} />
            ))}
            {step.event === events.length && (
              <li className="mt-2 rounded-sm bg-white/5 px-2 py-1.5 font-semibold">
                {w.teams[round.winnerTeamId]?.shortName} vence o round ({REASON[round.reason]}). {round.narration.includes('!') ? round.narration.split(').').pop() : ''}
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-md border border-white/10 bg-panel">
          <h3 className={`font-display border-b border-white/10 px-3 py-2 text-xs font-bold tracking-wider uppercase ${sideColor(b)}`}>{teamB.shortName}</h3>
          <Players t={b} />
        </section>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="font-display rounded-sm bg-white/10 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-white/15" onClick={() => setPaused(!paused)}>
          {paused ? 'Continuar' : 'Pausar'}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`font-display rounded-sm px-3 py-2 text-xs font-bold tracking-wider ${speed === s ? 'bg-ink text-black' : 'bg-white/10 hover:bg-white/15'}`}
          >
            {s}x
          </button>
        ))}
        <button className="font-display rounded-sm bg-white/10 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-white/15" onClick={() => skipTo((s) => s.event === -1)}>
          Pular round
        </button>
        <button className="font-display rounded-sm bg-white/10 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-white/15" onClick={() => skipTo((s) => s.map > step.map)}>
          Pular mapa
        </button>
        <button className="font-display ml-auto rounded-sm bg-win px-5 py-2 text-xs font-bold tracking-wider text-black uppercase hover:brightness-110" onClick={onFinish}>
          {done ? 'Ver resultado' : 'Pular para o resultado'}
        </button>
      </div>
    </div>
  );
}
