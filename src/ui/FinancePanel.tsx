import { useState } from 'react';
import { formatDate, formatMonth } from '../engine/date';
import { payroll, projectedBalance, sponsorIncome } from '../engine/finance/monthly';
import { freeSlots } from '../engine/finance/sponsors';
import { BAND_LABEL, bandOf, fairSalary } from '../engine/morale/satisfaction';
import { LEDGER_LABEL, type LedgerCategory } from '../engine/world';
import { useGame, useWorld } from '../store/game';
import { ROLE_LABEL, money } from './format';

const signed = (v: number) => `${v >= 0 ? '+' : '−'} ${money(Math.abs(v))}`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-display mt-1 text-2xl font-bold tabular-nums ${tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : ''}`}>{value}</div>
    </div>
  );
}

export function FinancePanel() {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const accept = useGame((s) => s.acceptSponsorOffer);
  const decline = useGame((s) => s.declineSponsorOffer);
  const cut = useGame((s) => s.proposeSalaryCut);
  const [cutPct, setCutPct] = useState(10);
  const team = w.teams[myTeamId];
  const income = sponsorIncome(team, w.date);
  const folha = payroll(w, team);
  const month = w.date.slice(0, 7);

  // Extrato por mês e por categoria.
  const byMonth = new Map<string, { in: number; out: number }>();
  const thisMonth = new Map<LedgerCategory, number>();
  for (const e of w.ledger) {
    const m = e.date.slice(0, 7);
    const cur = byMonth.get(m) ?? { in: 0, out: 0 };
    if (e.amount > 0) cur.in += e.amount;
    else cur.out += -e.amount;
    byMonth.set(m, cur);
    if (m === month) thisMonth.set(e.category, (thisMonth.get(e.category) ?? 0) + e.amount);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  const slots = freeSlots(team, w.date);
  const active = team.sponsors.filter((s) => s.endDate >= w.date);

  return (
    <div className="space-y-4">
      {team.lateMonths > 0 && (
        <div className="rounded-xl border border-loss/50 bg-loss/10 p-4 text-sm text-loss">
          Salários atrasados há {team.lateMonths} {team.lateMonths === 1 ? 'mês' : 'meses'} ({money(team.arrears)} devidos). O elenco está insatisfeito,
          patrocinadores novos não aparecem e, com 3 meses, jogadores insatisfeitos podem rescindir de graça.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Caixa" value={money(team.money)} tone={team.money < 0 ? 'loss' : undefined} />
        <Stat label="Patrocínios por mês" value={money(income)} />
        <Stat label="Folha por mês" value={money(folha)} />
        <Stat label="Saldo em 3 meses" value={money(projectedBalance(w, myTeamId, 3))} tone={projectedBalance(w, myTeamId, 3) < 0 ? 'loss' : undefined} />
        <Stat label="Saldo em 6 meses" value={money(projectedBalance(w, myTeamId, 6))} tone={projectedBalance(w, myTeamId, 6) < 0 ? 'loss' : undefined} />
      </div>
      <p className="text-xs text-muted">
        Patrocínios entram e salários saem no dia 1º de cada mês. A projeção considera só patrocínios ativos e a folha atual (sem premiações e vendas).
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl font-bold">Este mês ({formatMonth(w.date)})</h3>
          {thisMonth.size === 0 ? (
            <p className="mt-2 text-sm text-muted">Nenhum movimento ainda.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {[...thisMonth.entries()].map(([cat, v]) => (
                <li key={cat} className="flex justify-between border-b border-line/40 pb-1">
                  <span>{LEDGER_LABEL[cat]}</span>
                  <span className={`tabular-nums ${v >= 0 ? 'text-win' : 'text-loss'}`}>{signed(v)}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Últimos meses</h4>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium">Mês</th>
                <th className="text-right font-medium">Entradas</th>
                <th className="text-right font-medium">Saídas</th>
                <th className="text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {months.map(([m, v]) => (
                <tr key={m} className="border-t border-line/40">
                  <td className="py-1">{formatMonth(`${m}-01`)}</td>
                  <td className="text-right text-win tabular-nums">{money(v.in)}</td>
                  <td className="text-right text-loss tabular-nums">{money(v.out)}</td>
                  <td className={`text-right tabular-nums ${v.in - v.out >= 0 ? 'text-win' : 'text-loss'}`}>{signed(v.in - v.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl font-bold">Patrocinadores</h3>
          <p className="text-sm text-muted">
            1 master + 3 comuns. Vagas livres: {slots.master ? 'master, ' : ''}
            {slots.regular} {slots.regular === 1 ? 'comum' : 'comuns'}.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {active.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-x-3 border-b border-line/40 pb-1">
                <span>
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${s.slot === 'master' ? 'bg-accent text-black' : 'bg-panel-2 text-muted'}`}>
                    {s.slot === 'master' ? 'Master' : 'Comum'}
                  </span>
                  {s.brand}
                </span>
                <span className="text-muted tabular-nums">
                  {money(s.monthly)}/mês · até {formatMonth(s.endDate)} · título +{money(s.titleBonus)}
                </span>
              </li>
            ))}
          </ul>
          <h4 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Propostas de patrocínio</h4>
          {w.sponsorOffers.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma proposta. Novas chegam todo mês (se os salários estiverem em dia).</p>
          ) : (
            <ul className="space-y-2">
              {w.sponsorOffers.map((o) => {
                const canSign = o.slot === 'master' ? slots.master : slots.regular > 0;
                return (
                  <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">
                        {o.brand} <span className="text-xs text-muted">({o.slot === 'master' ? 'master' : 'comum'})</span>
                      </span>
                      <span className="tabular-nums">{money(o.monthly)}/mês</span>
                    </div>
                    <p className="text-xs text-muted">
                      {o.months} meses · bônus por título {money(o.titleBonus)} · expira em {formatDate(o.expires)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={!canSign}
                        onClick={() => accept(o.id)}
                        className="rounded-lg bg-accent px-3 py-1 text-sm font-semibold text-black disabled:opacity-40"
                        title={canSign ? undefined : 'Sem vaga livre para esse tipo'}
                      >
                        Assinar
                      </button>
                      <button type="button" onClick={() => decline(o.id)} className="rounded-lg border border-line px-3 py-1 text-sm text-muted hover:text-ink">
                        Recusar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold">Folha salarial</h3>
            <p className="text-sm text-muted">Referência = salário de mercado para o OVR atual. Abaixo de 80% dela, o jogador pede aumento.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <select className="rounded-lg border border-line bg-panel-2 px-2 py-1.5" value={cutPct} onChange={(e) => setCutPct(Number(e.target.value))} aria-label="Percentual da redução">
              {[10, 20, 30].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
            <button type="button" onClick={() => cut(team.playerIds, cutPct)} className="rounded-lg border border-loss/50 px-3 py-1.5 text-loss hover:bg-loss/10">
              Propor redução coletiva
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-medium">Jogador</th>
                <th className="text-right font-medium">Salário</th>
                <th className="text-right font-medium">Referência</th>
                <th className="text-right font-medium">Contrato até</th>
                <th className="pl-4 text-left font-medium">Humor</th>
              </tr>
            </thead>
            <tbody>
              {team.playerIds.map((id) => {
                const p = w.players[id];
                const ref = fairSalary(p);
                const band = bandOf(p.satisfaction);
                return (
                  <tr key={id} className="border-t border-line/40">
                    <td className="py-1.5">
                      <span className="font-semibold">{p.nick}</span> <span className="text-xs text-muted">{ROLE_LABEL[p.role]}</span>
                    </td>
                    <td className={`text-right tabular-nums ${p.contract && p.contract.salary < ref * 0.8 ? 'text-loss' : ''}`}>{money(p.contract?.salary ?? 0)}</td>
                    <td className="text-right text-muted tabular-nums">{money(ref)}</td>
                    <td className="text-right text-muted tabular-nums">{p.contract ? formatMonth(p.contract.endDate) : '–'}</td>
                    <td className="pl-4">
                      <MoodTag band={band} value={p.satisfaction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function MoodTag({ band, value }: { band: ReturnType<typeof bandOf>; value: number }) {
  const color = band === 'satisfeito' ? 'text-win' : band === 'incomodado' ? 'text-accent' : 'text-loss';
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {BAND_LABEL[band]} <span className="font-normal text-muted tabular-nums">({value})</span>
    </span>
  );
}
