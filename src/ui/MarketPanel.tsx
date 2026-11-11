import { useMemo, useState } from 'react';
import { formatDate, formatMonth } from '../engine/date';
import { recentlyMoved } from '../engine/market/ai';
import { startNegotiation, type DealKind, type Negotiation } from '../engine/market/negotiation';
import { getRelation, relationLabel } from '../engine/market/relations';
import { marketValue } from '../engine/market/value';
import { playerOvr } from '../engine/player';
import { ROLES, type Player, type Role } from '../engine/types';
import type { TransferKind } from '../engine/world';
import { marketOpen, useGame, useWorld } from '../store/game';
import { ROLE_LABEL, money } from './format';
import { NegotiationDialog } from './NegotiationDialog';
import { TeamBadge } from './TeamBadge';

type SubTab = 'jogadores' | 'propostas' | 'movimentacoes' | 'relacoes';

function PlayerDetail({ p, onDeal }: { p: Player; onDeal: (kind: DealKind, tradePlayerId?: string) => void }) {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const open = useGame((s) => marketOpen(s));
  const myTeam = w.teams[myTeamId];
  const team = p.teamId ? w.teams[p.teamId] : null;
  const [tradeId, setTradeId] = useState(myTeam.playerIds[0]);
  const mine = p.teamId === myTeamId;
  const btn = 'rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';
  const relation = team ? getRelation(w.relations, myTeamId, team.id) : 0;

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display truncate text-2xl font-bold">{p.nick}</h3>
          <p className="text-sm text-muted">
            {ROLE_LABEL[p.role]} · {p.age} anos · {p.country}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold">{playerOvr(p)}</div>
          <div className="text-xs text-muted">OVR</div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Time</dt>
        <dd className="flex items-center gap-1.5">
          {team ? (
            <>
              <TeamBadge team={team} size={18} /> {team.shortName}
            </>
          ) : (
            'Agente livre'
          )}
        </dd>
        <dt className="text-muted">Valor de mercado</dt>
        <dd>{money(marketValue(p, w.date))}</dd>
        {p.contract && (
          <>
            <dt className="text-muted">Salário</dt>
            <dd>{money(p.contract.salary)}/mês</dd>
            <dt className="text-muted">Contrato até</dt>
            <dd>{formatMonth(p.contract.endDate)}</dd>
            <dt className="text-muted">Multa</dt>
            <dd>{money(p.contract.releaseClause)}</dd>
          </>
        )}
        {team && !mine && (
          <>
            <dt className="text-muted">Relação</dt>
            <dd>
              {relationLabel(relation)} ({relation > 0 ? '+' : ''}
              {relation})
            </dd>
          </>
        )}
      </dl>
      {p.transferListed && <p className="mt-2 text-sm text-accent">À venda pelo time.</p>}
      {recentlyMoved(w, p.id) && !mine && <p className="mt-2 text-xs text-muted">Chegou ao time há pouco tempo.</p>}

      {!mine && (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {!open && <p className="text-sm text-muted">Fora da janela de transferências: só agentes livres.</p>}
          {team ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!open} onClick={() => onDeal('transfer')} className={`${btn} bg-accent text-black hover:brightness-110`}>
                  Fazer proposta
                </button>
                <button
                  type="button"
                  disabled={!open || myTeam.money < (p.contract?.releaseClause ?? Infinity)}
                  onClick={() => onDeal('clause')}
                  className={`${btn} border border-loss/50 text-loss hover:bg-loss/10`}
                  title="O time não pode recusar, mas a relação piora muito."
                >
                  Pagar multa ({money(p.contract?.releaseClause ?? 0)})
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
                  value={tradeId}
                  onChange={(e) => setTradeId(e.target.value)}
                  aria-label="Jogador seu para a troca"
                >
                  {myTeam.playerIds.map((id) => (
                    <option key={id} value={id}>
                      {w.players[id].nick} ({ROLE_LABEL[w.players[id].role]}, {playerOvr(w.players[id])})
                    </option>
                  ))}
                </select>
                <button type="button" disabled={!open} onClick={() => onDeal('trade', tradeId)} className={`${btn} border border-line text-ink hover:border-white/40`}>
                  Propor troca
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => onDeal('free')} className={`${btn} bg-accent text-black hover:brightness-110`}>
              Contratar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PlayersTab({ onDeal }: { onDeal: (kind: DealKind, playerId: string, tradePlayerId?: string) => void }) {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [filter, setFilter] = useState<'todos' | 'livres' | 'venda'>('todos');
  const [limit, setLimit] = useState(40);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    return Object.values(w.players)
      .filter((p) => p.teamId !== myTeamId && p.squad !== 'academy')
      .filter((p) => !q || p.nick.toLowerCase().includes(q.toLowerCase()))
      .filter((p) => !role || p.role === role)
      .filter((p) => (filter === 'livres' ? !p.teamId : filter === 'venda' ? p.transferListed : true))
      .map((p) => ({ p, ovr: playerOvr(p), value: marketValue(p, w.date) }))
      .sort((a, b) => b.ovr - a.ovr);
  }, [w, myTeamId, q, role, filter]);

  const sel = selected ? w.players[selected] : null;
  const field = 'rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${field} min-w-0 flex-1`} placeholder="Buscar jogador…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar jogador" />
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role | '')} aria-label="Função">
            <option value="">Todas as funções</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <select className={field} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Situação">
            <option value="todos">Todos</option>
            <option value="livres">Agentes livres</option>
            <option value="venda">À venda</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Jogador</th>
                <th className="text-left font-medium">Função</th>
                <th className="text-right font-medium">Idade</th>
                <th className="text-right font-medium">OVR</th>
                <th className="pl-3 text-left font-medium">Time</th>
                <th className="text-right font-medium">Valor</th>
                <th className="px-3 text-right font-medium">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, limit).map(({ p, ovr, value }) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`cursor-pointer border-t border-line/60 hover:bg-panel-2/60 ${selected === p.id ? 'bg-accent/10' : ''}`}
                >
                  <td className="px-3 py-1.5">
                    <span className="font-semibold">{p.nick}</span> <span className="text-xs text-muted">{p.country}</span>
                    {p.transferListed && <span className="ml-1.5 text-[10px] font-semibold text-accent">À VENDA</span>}
                  </td>
                  <td className="text-muted">{ROLE_LABEL[p.role]}</td>
                  <td className="text-right tabular-nums">{p.age}</td>
                  <td className="font-display text-right text-base font-bold tabular-nums">{ovr}</td>
                  <td className="pl-3">{p.teamId ? w.teams[p.teamId].shortName : <span className="text-win">Livre</span>}</td>
                  <td className="text-right tabular-nums">{money(value)}</td>
                  <td className="px-3 text-right text-muted tabular-nums">{p.contract ? formatMonth(p.contract.endDate) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 40)} className="mt-2 text-sm text-accent hover:underline">
            Mostrar mais ({list.length - limit} restantes)
          </button>
        )}
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        {sel ? (
          <PlayerDetail p={sel} onDeal={(kind, tradeId) => onDeal(kind, sel.id, tradeId)} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">Escolha um jogador na lista para ver o contrato e negociar.</p>
        )}
      </div>
    </div>
  );
}

function OffersTab() {
  const w = useWorld();
  const respond = useGame((s) => s.respondOffer);
  const open = useGame((s) => marketOpen(s));
  const [counter, setCounter] = useState<Record<string, number>>({});
  return (
    <div>
      <section>
        <h3 className="font-display mb-2 text-xl font-bold">Propostas recebidas</h3>
        {w.offers.length === 0 && <p className="text-sm text-muted">Nenhuma proposta no momento. Coloque um jogador à venda para atrair interessados.</p>}
        <ul className="space-y-2">
          {w.offers.map((o) => {
            const p = w.players[o.playerId];
            const t = w.teams[o.fromTeamId];
            const value = marketValue(p, w.date);
            const c = counter[o.id] ?? Math.round((o.fee * 1.1) / 10_000) * 10_000;
            return (
              <li key={o.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-3">
                  <TeamBadge team={t} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t.shortName} quer {p.nick}
                    </p>
                    <p className="text-sm text-muted">
                      {money(o.fee)} · valor de mercado {money(value)} · expira em {formatDate(o.expires)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={!open} onClick={() => respond(o.id, { kind: 'accept' })} className="rounded-lg bg-win px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40">
                    Aceitar
                  </button>
                  <button type="button" onClick={() => respond(o.id, { kind: 'refuse' })} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
                    Recusar
                  </button>
                  <span className="flex items-center gap-1 text-sm">
                    <input
                      className="w-24 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-right tabular-nums"
                      inputMode="numeric"
                      value={Math.round(c / 1000)}
                      onChange={(e) => setCounter({ ...counter, [o.id]: (Number(e.target.value.replace(/\D/g, '')) || 0) * 1000 })}
                      aria-label="Contraproposta em mil dólares"
                    />
                    <span className="text-muted">mil</span>
                    <button
                      type="button"
                      disabled={!open}
                      onClick={() => respond(o.id, { kind: 'counter', fee: c })}
                      className="rounded-lg border border-accent/50 px-3 py-1.5 text-accent disabled:opacity-40"
                    >
                      Contrapropor
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

const KIND_LABEL: Record<TransferKind, string> = {
  transferencia: 'Transferência',
  multa: 'Multa paga',
  troca: 'Troca',
  livre: 'Contratação',
  fim_contrato: 'Fim de contrato',
  renovacao: 'Renovação',
  dispensa: 'Dispensa',
  rescisao: 'Rescisão',
};

function MovesTab() {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  if (!w.transferLog.length) return <p className="text-sm text-muted">Nenhuma movimentação ainda. Avance os dias para o mercado se mexer.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {w.transferLog.map((e, i) => {
        const p = w.players[e.playerId];
        const from = e.fromTeamId ? w.teams[e.fromTeamId].shortName : 'livre';
        const to = e.toTeamId ? w.teams[e.toTeamId].shortName : 'livre';
        const involvesMe = e.fromTeamId === myTeamId || e.toTeamId === myTeamId;
        return (
          <li key={i} className={`flex flex-wrap gap-x-3 border-b border-line/40 pb-1 ${involvesMe ? 'text-accent' : ''}`}>
            <span className="w-24 shrink-0 text-muted">{formatDate(e.date)}</span>
            <span className="w-28 shrink-0 text-muted">{KIND_LABEL[e.kind]}</span>
            <span>
              <span className="font-semibold">{p.nick}</span>{' '}
              {e.kind === 'renovacao' ? `renovou com ${to}` : `${from} → ${to}`}
              {e.kind === 'troca' && e.otherPlayerId && ` (por ${w.players[e.otherPlayerId].nick})`}
              {e.fee > 0 && e.kind !== 'troca' && ` · ${money(e.fee)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RelationsTab() {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const rows = Object.values(w.teams)
    .filter((t) => t.id !== myTeamId)
    .map((t) => ({ t, v: getRelation(w.relations, myTeamId, t.id) }))
    .sort((a, b) => b.v - a.v);
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Relação boa barateia e facilita negócios; ruim encarece; abaixo de −60 o time nem negocia. Negócios fechados melhoram a relação; negociações
        frustradas e multas pagas pioram.
      </p>
      <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ t, v }) => (
          <li key={t.id} className="flex items-center gap-2 border-b border-line/40 py-1">
            <TeamBadge team={t} size={20} />
            <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
            <span className={`tabular-nums ${v >= 20 ? 'text-win' : v <= -20 ? 'text-loss' : 'text-muted'}`}>
              {v > 0 ? '+' : ''}
              {v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketPanel() {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const [tab, setTab] = useState<SubTab>('jogadores');
  const [neg, setNeg] = useState<Negotiation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deal = (kind: DealKind, playerId: string, tradePlayerId?: string) => {
    const r = startNegotiation(w, kind, playerId, myTeamId, tradePlayerId ?? null);
    if (!r.ok) return setError(r.error);
    setError(null);
    setNeg(r.neg);
  };

  const tabs: Array<[SubTab, string]> = [
    ['jogadores', 'Jogadores'],
    ['propostas', `Propostas${w.offers.length ? ` (${w.offers.length})` : ''}`],
    ['movimentacoes', 'Movimentações'],
    ['relacoes', 'Relações'],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4">
        <span className="text-sm text-muted">{marketOpen({ date: w.date }) ? 'Janela de transferências aberta.' : 'Fora da janela: só agentes livres e renovações.'}</span>
        <span className="text-sm text-muted">
          Elenco: {w.teams[myTeamId].playerIds.length}/7 · Caixa {money(w.teams[myTeamId].money)}
        </span>
      </div>
      <nav className="flex flex-wrap gap-1">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`font-display rounded-lg px-3 py-1.5 font-bold transition ${tab === k ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && <div className="rounded-lg bg-loss/15 px-4 py-2 text-sm text-loss">{error}</div>}
      {tab === 'jogadores' && <PlayersTab onDeal={deal} />}
      {tab === 'propostas' && <OffersTab />}
      {tab === 'movimentacoes' && <MovesTab />}
      {tab === 'relacoes' && <RelationsTab />}
      {neg && <NegotiationDialog initial={neg} onClose={() => setNeg(null)} />}
    </div>
  );
}

