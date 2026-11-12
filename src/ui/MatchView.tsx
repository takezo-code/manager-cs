import { useState } from 'react';
import { MAP_NAMES } from '../engine/config';
import { adr, calcRating } from '../engine/rating';
import type { MapResult, MatchFormat, MatchResult, MatchStage, Player, Team } from '../engine/types';
import { useGame, useWorld } from '../store/game';
import { ratingColor } from './format';
import { TeamBadge } from './TeamBadge';

const STAGE_LABEL: Record<MatchStage, string> = { grupos: 'Fase de grupos', playoffs: 'Playoffs', final: 'Final' };

export function MatchSetup() {
  const teams = useGame((s) => s.teams);
  const myTeamId = useGame((s) => s.myTeamId)!;
  const play = useGame((s) => s.playMatch);
  const opponents = Object.values(teams)
    .filter((t) => t.id !== myTeamId)
    .sort((a, b) => a.hltvRank - b.hltvRank);
  const [opp, setOpp] = useState(opponents[0].id);
  const [format, setFormat] = useState<MatchFormat>('MD3');
  const [stage, setStage] = useState<MatchStage>('playoffs');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  const field = 'rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm w-full';
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-bold">Amistoso</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-muted sm:col-span-2">
          Adversário
          <select className={`mt-1 ${field} text-ink`} value={opp} onChange={(e) => setOpp(e.target.value)}>
            {opponents.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.hltvRank} {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Formato
          <select className={`mt-1 ${field} text-ink`} value={format} onChange={(e) => setFormat(e.target.value as MatchFormat)}>
            <option value="MD1">MD1</option>
            <option value="MD3">MD3</option>
            <option value="MD5">MD5</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Fase
          <select className={`mt-1 ${field} text-ink`} value={stage} onChange={(e) => setStage(e.target.value as MatchStage)}>
            {(Object.keys(STAGE_LABEL) as MatchStage[]).map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted">
          Semente
          <input
            className={`mt-1 ${field} w-40 text-ink tabular-nums`}
            value={seed}
            inputMode="numeric"
            onChange={(e) => setSeed(Number(e.target.value.replace(/\D/g, '')) || 0)}
          />
        </label>
        <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 1e9))} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-ink">
          Nova semente
        </button>
        <button
          type="button"
          onClick={() => play(opp, format, stage, seed)}
          className="ml-auto rounded-lg bg-accent px-6 py-2 font-semibold text-black transition hover:brightness-110"
        >
          Simular partida
        </button>
      </div>
    </div>
  );
}

function Scoreboard({ map, teams, players }: { map: MapResult; teams: Team[]; players: Record<string, Player> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {teams.map((t) => {
        const rows = t.playerIds
          .map((id) => ({ p: players[id], s: map.stats[id] }))
          .map((r) => ({ ...r, rating: calcRating(r.s) }))
          .sort((a, b) => b.rating - a.rating);
        return (
          <div key={t.id} className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-panel-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.shortName}</th>
                  <th className="px-2 text-right font-medium">K-D</th>
                  <th className="px-2 text-right font-medium">+/-</th>
                  <th className="px-2 text-right font-medium">ADR</th>
                  <th className="px-2 text-right font-medium">KAST</th>
                  <th className="px-3 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, s, rating }) => {
                  const diff = s.kills - s.deaths;
                  return (
                    <tr key={p.id} className="border-t border-line/60">
                      <td className="px-3 py-1.5 font-semibold">{p.nick}</td>
                      <td className="px-2 text-right tabular-nums">
                        {s.kills}-{s.deaths}
                      </td>
                      <td className={`px-2 text-right tabular-nums ${diff > 0 ? 'text-win' : diff < 0 ? 'text-loss' : 'text-muted'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="px-2 text-right tabular-nums">{adr(s)}</td>
                      <td className="px-2 text-right tabular-nums">{s.rounds ? Math.round((s.kastRounds / s.rounds) * 100) : 0}%</td>
                      <td className={`font-display px-3 text-right text-base font-bold tabular-nums ${ratingColor(rating)}`}>
                        {rating.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function RoundStrip({ map, teamA, teamB }: { map: MapResult; teamA: Team; teamB: Team }) {
  return (
    <div className="space-y-1">
      {[teamA, teamB].map((t) => (
        <div key={t.id} className="flex items-center gap-1">
          <span className="w-16 shrink-0 truncate text-xs font-semibold text-muted">{t.shortName}</span>
          <div className="flex flex-wrap gap-0.5">
            {map.rounds.map((r) => {
              const won = r.winnerTeamId === t.id;
              const ct = r.ctTeamId === t.id;
              return (
                <span
                  key={r.number}
                  title={`Round ${r.number}: ${r.narration}`}
                  className={`h-4 w-3 rounded-sm ${won ? (ct ? 'bg-ct' : 'bg-tr') : 'bg-white/5'} ${
                    r.number === 13 || (r.number > 24 && (r.number - 25) % 3 === 0) ? 'ml-1.5' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatchView({ result }: { result: MatchResult }) {
  const world = useWorld();
  const teams = world.teams;
  const players = useGame((s) => s.players);
  const teamA = teams[result.teamAId];
  const teamB = teams[result.teamBId];
  const [mapIdx, setMapIdx] = useState(0);
  const map = result.maps[Math.min(mapIdx, result.maps.length - 1)];
  const [showAll, setShowAll] = useState(false);

  const allPlayers = [...teamA.playerIds, ...teamB.playerIds];
  const mvpId = allPlayers.reduce((best, id) => (result.ratings[id] > result.ratings[best] ? id : best), allPlayers[0]);

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span className="font-display truncate text-xl font-bold sm:text-2xl">{teamA.shortName}</span>
          <TeamBadge team={teamA} size={44} />
        </div>
        <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">
          <span className={result.winnerTeamId === teamA.id ? 'text-win' : 'text-muted'}>{result.mapScore[teamA.id]}</span>
          <span className="mx-2 text-muted">:</span>
          <span className={result.winnerTeamId === teamB.id ? 'text-win' : 'text-muted'}>{result.mapScore[teamB.id]}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TeamBadge team={teamB} size={44} />
          <span className="font-display truncate text-xl font-bold sm:text-2xl">{teamB.shortName}</span>
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        {result.format} · {STAGE_LABEL[result.stage]} · semente {result.seed} · MVP:{' '}
        <span className="font-semibold text-accent">
          {players[mvpId].nick} ({result.ratings[mvpId].toFixed(2)})
        </span>
      </p>

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Veto</h3>
        <ol className="flex flex-wrap gap-1.5 text-xs">
          {result.veto.map((v, i) => (
            <li
              key={i}
              className={`rounded-md px-2 py-1 ${
                v.action === 'ban' ? 'bg-white/5 text-muted line-through' : 'bg-accent/15 font-semibold text-accent'
              }`}
            >
              {v.teamId ? `${teams[v.teamId].shortName} ${v.action === 'ban' ? 'bane' : 'escolhe'}` : 'Decider'} {MAP_NAMES[v.map]}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        {result.maps.map((m, i) => (
          <button
            key={m.map}
            type="button"
            onClick={() => setMapIdx(i)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              i === mapIdx ? 'border-accent bg-accent/10' : 'border-line hover:border-white/30'
            }`}
          >
            <div className="font-display font-bold">{MAP_NAMES[m.map]}</div>
            <div className="tabular-nums">
              {m.score[teamA.id]} – {m.score[teamB.id]}
              {m.overtimes > 0 && <span className="ml-1 text-xs text-muted">({m.overtimes} OT)</span>}
            </div>
          </button>
        ))}
      </div>

      <RoundStrip map={map} teamA={teamA} teamB={teamB} />
      <p className="text-xs text-muted">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-ct align-middle" /> vitória como CT
        <span className="mr-1 ml-3 inline-block h-2.5 w-2.5 rounded-sm bg-tr align-middle" /> vitória como TR
      </p>

      <Scoreboard map={map} teams={[teamA, teamB]} players={players} />

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Narração</h3>
        <ol className="space-y-1 text-sm">
          {(showAll ? map.rounds : map.rounds.slice(-8)).map((r) => (
            <li key={r.number} className="flex gap-3 border-b border-line/40 pb-1">
              <span className="w-8 shrink-0 text-right text-muted tabular-nums">R{r.number}</span>
              <span className="w-12 shrink-0 text-muted tabular-nums">
                {r.scoreAfter[teamA.id]}-{r.scoreAfter[teamB.id]}
              </span>
              <span>{r.narration}</span>
            </li>
          ))}
        </ol>
        {map.rounds.length > 8 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-sm text-accent hover:underline">
            {showAll ? 'Mostrar só os últimos rounds' : `Ver todos os ${map.rounds.length} rounds`}
          </button>
        )}
      </div>
    </div>
  );
}
