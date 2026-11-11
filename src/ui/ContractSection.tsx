import { useState } from 'react';
import { formatMonth } from '../engine/date';
import { startNegotiation, type Negotiation } from '../engine/market/negotiation';
import { contractMonthsLeft, marketValue } from '../engine/market/value';
import type { Player } from '../engine/types';
import { marketOpen, useGame, useWorld } from '../store/game';
import { money } from './format';
import { NegotiationDialog } from './NegotiationDialog';

/** Contrato, titularidade e venda de um jogador do seu time. */
export function ContractSection({ player }: { player: Player }) {
  const w = useWorld();
  const myTeamId = useGame((s) => s.myTeamId)!;
  const open = useGame((s) => marketOpen(s));
  const toggleListed = useGame((s) => s.toggleListed);
  const setStarter = useGame((s) => s.setStarter);
  const [neg, setNeg] = useState<Negotiation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const team = w.teams[myTeamId];
  const isStarter = team.starters.includes(player.id);
  const c = player.contract;
  const months = contractMonthsLeft(player, w.date);

  const renew = () => {
    const r = startNegotiation(w, 'renewal', player.id, myTeamId);
    if (!r.ok) return setError(r.error);
    setError(null);
    setNeg(r.neg);
  };

  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="font-display text-lg font-bold">Contrato</h3>
      {c && (
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-muted">Salário</dt>
          <dd>{money(c.salary)}/mês</dd>
          <dt className="text-muted">Até</dt>
          <dd className={months < 6 ? 'text-loss' : ''}>
            {formatMonth(c.endDate)} ({Math.floor(months)} meses)
          </dd>
          <dt className="text-muted">Multa</dt>
          <dd>{money(c.releaseClause)}</dd>
          <dt className="text-muted">Valor de mercado</dt>
          <dd>{money(marketValue(player, w.date))}</dd>
        </dl>
      )}
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!open} onClick={renew} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-40">
          Renovar contrato
        </button>
        <button
          type="button"
          onClick={() => toggleListed(player.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${player.transferListed ? 'border-accent bg-accent/10 text-accent' : 'border-line hover:border-white/40'}`}
        >
          {player.transferListed ? 'À venda (tirar)' : 'Colocar à venda'}
        </button>
      </div>
      {!isStarter && (
        <label className="mt-3 block text-xs text-muted">
          Reserva. Entrar como titular no lugar de:
          <select
            className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink"
            value=""
            onChange={(e) => e.target.value && setStarter(player.id, e.target.value)}
          >
            <option value="">Escolher titular…</option>
            {team.starters.map((id) => (
              <option key={id} value={id}>
                {w.players[id].nick}
              </option>
            ))}
          </select>
        </label>
      )}
      {neg && <NegotiationDialog initial={neg} onClose={() => setNeg(null)} />}
    </section>
  );
}
