import { useState } from 'react';
import { visibleAmateurs, type Amateur } from '../engine/amateurs';
import { baseStandings } from '../engine/baseLeague';
import { ACADEMY, MARKET, SCOUT, TIER2 } from '../engine/config';
import { formatDate } from '../engine/date';
import { managerOrg } from '../engine/manager/model';
import { LOAN_MONTHS, loanTargets } from '../engine/tier2/loans';
import { baseOvr } from '../engine/form';
import { estimatePotential } from '../engine/scout';
import { scoutNarrowing } from '../engine/manager/effects';
import type { Player } from '../engine/types';
import { useGame, useWorld } from '../store/game';
import { money, ROLE_LABEL } from './format';
import { TeamBadge } from './TeamBadge';

/** Escala das barras de potencial. */
const LO = 40;
const HI = 100;
const pct = (v: number) => `${((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * 100}%`;

/** Barra 40–100: ponto = OVR atual, faixa = POT estimado pelo olheiro. */
function PotentialBar({ ovr, min, max }: { ovr: number; min: number; max: number }) {
  return (
    <div className="relative h-2.5 w-full rounded-full bg-black/40" aria-label={`OVR ${ovr}, potencial estimado entre ${min} e ${max}`}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: pct(ovr) }} />
      <span
        className="absolute inset-y-0 rounded-full bg-accent/70"
        style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }}
      />
      <span className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-sm bg-ink" style={{ left: pct(ovr) }} />
    </div>
  );
}

function Alerts({ alerts }: { alerts: string[] }) {
  if (!alerts.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {alerts.map((a) => (
        <span key={a} className="rounded bg-prime/15 px-1.5 py-0.5 text-[11px] font-semibold text-prime">
          {a}
        </span>
      ))}
    </div>
  );
}

function ScoutHeader({ level, cash }: { level: number; cash: number }) {
  const upgrade = useGame((s) => s.upgradeScout);
  const price = level < 5 ? SCOUT.upgradePrices[level - 1] : null;
  const range = SCOUT.levels[level - 1].range;
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel px-4 py-3">
      <div>
        <h2 className="font-display text-lg font-bold">Olheiro</h2>
        <div className="mt-1 flex gap-1" aria-label={`Nível ${level} de 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`h-2 w-7 rounded-full ${n <= level ? 'bg-accent' : 'bg-black/40'}`} />
          ))}
        </div>
      </div>
      <p className="min-w-0 flex-1 text-sm text-muted">
        Estima o potencial com margem de ±{range}
        {level < 4 ? ' e às vezes erra. No nível 4 aponta as revelações.' : '. Aponta revelações e jovens com muito a crescer.'}
      </p>
      {price !== null ? (
        <button
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-40"
          disabled={cash < price}
          onClick={upgrade}
        >
          Subir para nível {level + 1} · {money(price)}
        </button>
      ) : (
        <span className="text-sm font-semibold text-accent">Nível máximo</span>
      )}
    </section>
  );
}

function LoanControls({ p }: { p: Player }) {
  const w = useWorld();
  const loan = useGame((s) => s.loanYouth);
  const recall = useGame((s) => s.recallYouth);
  const [to, setTo] = useState('');
  const [months, setMonths] = useState<number>(6);
  if (p.loan)
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        Emprestado à {w.teams[p.loan.teamId]?.name} até {formatDate(p.loan.until)}
        <button type="button" className="rounded-lg border border-line px-2 py-1 font-semibold text-ink hover:border-accent" onClick={() => recall(p.id)}>
          Chamar de volta · {money(TIER2.recallFee)}
        </button>
      </div>
    );
  const teams = loanTargets(w);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <select className="rounded-lg border border-line bg-panel-2 px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Time do empréstimo">
        <option value="">Emprestar para…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            #{t.hltvRank} {t.name} ({t.region})
          </option>
        ))}
      </select>
      <select className="rounded-lg border border-line bg-panel-2 px-2 py-1" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Prazo do empréstimo">
        {LOAN_MONTHS.map((m) => (
          <option key={m} value={m}>
            {m} meses
          </option>
        ))}
      </select>
      <button type="button" disabled={!to} className="rounded-lg border border-line px-2 py-1 font-semibold hover:border-accent disabled:opacity-40" onClick={() => loan(p.id, to, months)}>
        Emprestar
      </button>
    </div>
  );
}

function YouthRow({ p, level, full }: { p: Player; level: number; full: boolean }) {
  const promoteYouth = useGame((s) => s.promoteYouth);
  const w = useWorld();
  const recommend = !!w.manager.academyOf && !w.managerTeamId;
  const e = estimatePotential(p, level, scoutNarrowing(w));
  const leaving = p.age >= ACADEMY.maxAge;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t border-line/60 px-4 py-3 first:border-t-0 sm:grid-cols-[10rem_1fr_auto]">
      <div className="min-w-0">
        <div className="truncate font-semibold">{p.nick}</div>
        <div className="text-xs text-muted">
          {ROLE_LABEL[p.role]} · <span className={leaving ? 'font-semibold text-loss' : ''}>{p.age} anos</span>
          {leaving && ' · sai em janeiro'}
        </div>
      </div>
      <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
        <PotentialBar ovr={baseOvr(p)} min={e.min} max={e.max} />
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
          <span>OVR {baseOvr(p)}</span>
          <span>
            POT {e.min}–{e.max}
          </span>
        </div>
        <Alerts alerts={e.alerts} />
        <div className="mt-2">
          <LoanControls p={p} />
        </div>
      </div>
      <button
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent disabled:opacity-40"
        disabled={full || !!p.loan}
        title={p.loan ? 'Chame de volta antes de promover' : full ? `Elenco principal cheio (${MARKET.squadMax})` : recommend ? 'A diretoria aceita se ele for quase tão bom quanto o pior titular' : undefined}
        onClick={() => promoteYouth(p.id)}
      >
        {recommend ? 'Recomendar' : 'Promover'}
      </button>
    </li>
  );
}

function PlatformBadge({ a }: { a: Amateur }) {
  const faceit = a.platform === 'FACEIT';
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[9px] font-bold leading-none ${
        faceit ? 'bg-[#ff5500]/15 text-[#ff7a33]' : 'bg-win/15 text-win'
      }`}
      title={faceit ? `FACEIT nível ${a.level}` : `GC rank ${a.level}`}
    >
      {faceit ? 'FACEIT' : 'GC'}
      <span className="font-display text-base">{a.level}</span>
    </span>
  );
}

function AmateurRow({ a, level, canSign }: { a: Amateur; level: number; canSign: boolean }) {
  const sign = useGame((s) => s.signAmateur);
  const w = useWorld();
  const e = estimatePotential(a.player, level, scoutNarrowing(w));
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line/60 px-4 py-3 first:border-t-0">
      <PlatformBadge a={a} />
      <div className="min-w-[8rem] flex-1">
        <div className="font-semibold">
          {a.player.nick} <span className="text-xs font-normal text-muted">{a.player.country} · {a.player.age} anos · {ROLE_LABEL[a.player.role]}</span>
        </div>
        <div className="text-xs tabular-nums text-muted">
          K/D {a.stats.kd.toFixed(2)} · ADR {a.stats.adr} · HS {a.stats.hs}% · vitórias {a.stats.winRate}%
        </div>
        <Alerts alerts={e.alerts} />
      </div>
      <div className="w-28 text-right text-xs tabular-nums text-muted">
        POT {e.min}–{e.max}
        <div className="font-semibold text-ink">{money(a.fee)}</div>
      </div>
      <button
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-40"
        disabled={!canSign}
        onClick={() => sign(a.player.id)}
      >
        Contratar
      </button>
    </li>
  );
}

export function AcademyPanel() {
  const world = useWorld();
  // Time do manager ou a org da academy que ele comanda.
  const me = managerOrg(world)!;
  const team = world.teams[me];
  const players = world.players;
  const level = team.scoutLevel ?? 1;
  const youth = team.academyIds.map((id) => players[id]).filter(Boolean);
  const full = team.playerIds.length >= MARKET.squadMax;
  const academyFull = youth.filter((p) => !p.loan).length >= ACADEMY.maxSize;
  const amateurs = visibleAmateurs(world);
  const table = baseStandings(world);
  const myGame = world.baseLeague.lastRound.find((g) => g.a === me || g.b === me);

  return (
    <div className="space-y-4">
      <ScoutHeader level={level} cash={team.money} />

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-display text-lg font-bold">Academy</h2>
          <span className="text-xs text-muted">
            {youth.filter((p) => !p.loan).length}/{ACADEMY.maxSize} jovens{youth.some((p) => p.loan) ? ` (+${youth.filter((p) => p.loan).length} emprestado)` : ''} · elenco principal {team.playerIds.length}/{MARKET.squadMax}
          </span>
        </div>
        {youth.length ? (
          <ol className="overflow-hidden rounded-2xl border border-line bg-panel">
            {youth.map((p) => (
              <YouthRow key={p.id} p={p} level={level} full={full} />
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Academy vazia. Contrate jovens na GC/FACEIT abaixo.
          </p>
        )}
        {youth.length < 5 && youth.length > 0 && (
          <p className="mt-2 text-xs text-loss">Com menos de 5 jovens a academy perde os jogos da liga de base por W.O.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="font-display text-lg font-bold">GC / FACEIT</h2>
            <span className="text-xs text-muted">{amateurs.length} amadores à vista · o banco muda todo mês</span>
          </div>
          <ol className="overflow-hidden rounded-2xl border border-line bg-panel">
            {amateurs.map((a) => (
              <AmateurRow key={a.player.id} a={a} level={level} canSign={!academyFull && team.money >= a.fee} />
            ))}
          </ol>
          {academyFull && <p className="mt-2 text-xs text-muted">Academy cheia ({ACADEMY.maxSize}). Promova alguém para abrir vaga.</p>}
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="font-display text-lg font-bold">Liga de base {world.baseLeague.season}</h2>
            <span className="text-xs text-muted">segundas, fev–nov</span>
          </div>
          {myGame && (
            <p className="mb-2 text-sm">
              Última rodada:{' '}
              <span className={myGame.winner === me ? 'font-semibold text-win' : 'font-semibold text-loss'}>
                {myGame.winner === me ? 'vitória' : 'derrota'}
              </span>{' '}
              contra {world.teams[myGame.a === me ? myGame.b : myGame.a].name}
              {myGame.wo && ' (W.O.)'}
            </p>
          )}
          <ol className="overflow-hidden rounded-2xl border border-line bg-panel text-sm">
            {table.map((r, i) => (
              <li key={r.teamId} className={`flex items-center gap-2 border-t border-line/60 px-3 py-1.5 first:border-t-0 ${r.teamId === me ? 'bg-accent/10' : ''}`}>
                <span className="w-6 tabular-nums text-muted">{i + 1}</span>
                <TeamBadge team={world.teams[r.teamId]} size={18} />
                <span className={`min-w-0 flex-1 truncate ${r.teamId === me ? 'font-semibold text-accent' : ''}`}>{world.teams[r.teamId].shortName}</span>
                <span className="w-14 text-right tabular-nums">
                  <span className="text-win">{r.w}</span>–<span className="text-loss">{r.l}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
