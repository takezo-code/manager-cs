import { useEffect, useRef, useState } from 'react';
import { formatMonth } from '../engine/date';
import { abandonNegotiation, offerClub, offerPlayer, suggestedTerms, tradeValueFor, type Negotiation, type Terms } from '../engine/market/negotiation';
import { marketValue } from '../engine/market/value';
import { MARKET } from '../engine/config';
import { playerOvr } from '../engine/player';
import { useGame, useWorld } from '../store/game';
import { ROLE_LABEL, money } from './format';

const KIND_TITLE: Record<Negotiation['kind'], string> = {
  transfer: 'Proposta de transferência',
  clause: 'Pagamento de multa',
  free: 'Contratação de agente livre',
  renewal: 'Renovação de contrato',
  trade: 'Proposta de troca',
};

/** Campo de dinheiro em milhares de US$ (mais fácil de digitar). */
function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-muted">
      {label}
      <div className="mt-1 flex items-center rounded-lg border border-line bg-panel-2 pr-3">
        <span className="pl-3 text-sm text-muted">US$</span>
        <input
          className="w-full min-w-0 bg-transparent px-2 py-2 text-sm text-ink tabular-nums outline-none"
          inputMode="numeric"
          value={Math.round(value / 1000)}
          onChange={(e) => onChange((Number(e.target.value.replace(/\D/g, '')) || 0) * 1000)}
        />
        <span className="text-sm text-muted">mil</span>
      </div>
    </label>
  );
}

export function NegotiationDialog({ initial, onClose }: { initial: Negotiation; onClose: () => void }) {
  const w = useWorld();
  const commit = useGame((s) => s.commitNegotiation);
  const [neg, setNeg] = useState(initial);
  const p = w.players[neg.playerId];
  const value = marketValue(p, w.date);
  const seller = neg.sellerId ? w.teams[neg.sellerId] : null;
  const [fee, setFee] = useState(() => (initial.kind === 'trade' ? 0 : Math.round(value / 10_000) * 10_000));
  const [terms, setTerms] = useState<Terms>(() => suggestedTerms(w, neg.playerId));
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [neg]);

  /** Atualiza a negociação e já preenche os campos com a contraproposta recebida. */
  const apply = (next: Negotiation) => {
    if (next.counterFee !== null) setFee(next.counterFee);
    if (next.counterTerms && next.phase === 'player') setTerms(next.counterTerms);
    setNeg(next);
  };

  const finished = neg.phase === 'done' || neg.phase === 'failed';
  const close = () => {
    if (finished) commit(neg);
    onClose();
  };
  const roundsLeft = MARKET.maxRounds - (neg.phase === 'club' ? neg.clubRound : neg.playerRound);
  const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal aria-label={KIND_TITLE[neg.kind]}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="border-b border-line p-5">
          <p className="text-xs font-semibold tracking-wider text-accent uppercase">{KIND_TITLE[neg.kind]}</p>
          <h2 className="font-display text-2xl font-bold">
            {p.nick} <span className="text-base font-medium text-muted">· {ROLE_LABEL[p.role]} · {p.age} anos · OVR {playerOvr(p)}</span>
          </h2>
          <p className="text-sm text-muted">
            {seller ? `${seller.name} · ` : neg.kind === 'free' ? 'Sem contrato · ' : ''}
            Valor de mercado {money(value)}
            {p.contract && ` · contrato até ${formatMonth(p.contract.endDate)}`}
          </p>
          {neg.kind === 'trade' && neg.tradePlayerId && seller && (
            <p className="mt-1 text-sm text-muted">
              Você oferece {w.players[neg.tradePlayerId].nick} (o {seller.shortName} avalia em {money(tradeValueFor(w, seller.id, neg.tradePlayerId))}).
            </p>
          )}
        </header>

        <div ref={logRef} className="min-h-24 flex-1 space-y-2 overflow-y-auto p-5">
          {neg.messages.length === 0 && (
            <p className="text-sm text-muted">
              {neg.phase === 'club'
                ? `Primeiro, acerte com o ${seller?.shortName}. Depois, com o jogador. Cada lado aceita até ${MARKET.maxRounds} propostas.`
                : 'Ofereça salário, duração e multa. Multa alta protege o jogador, mas ele pede mais salário.'}
            </p>
          )}
          {neg.messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'voce' ? 'justify-end' : ''}`}>
              <p
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.from === 'voce' ? 'bg-accent/15 text-ink' : m.from === 'time' ? 'bg-panel-2' : 'bg-ct/15'
                }`}
              >
                <span className="mb-0.5 block text-[10px] font-semibold tracking-wider text-muted uppercase">
                  {m.from === 'voce' ? 'Você' : m.from === 'time' ? seller?.shortName ?? 'Time' : p.nick}
                </span>
                {m.text}
              </p>
            </div>
          ))}
        </div>

        <footer className="space-y-3 border-t border-line p-5">
          {neg.phase === 'club' && (
            <>
              <MoneyInput label={neg.kind === 'trade' ? 'Dinheiro extra que você paga' : 'Valor da proposta'} value={fee} onChange={setFee} />
              <p className="text-xs text-muted">Restam {roundsLeft} propostas.</p>
            </>
          )}
          {neg.phase === 'player' && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <MoneyInput label="Salário mensal" value={terms.salary} onChange={(v) => setTerms({ ...terms, salary: v })} />
                <label className="text-xs text-muted">
                  Duração
                  <select
                    className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink"
                    value={terms.months}
                    onChange={(e) => setTerms({ ...terms, months: Number(e.target.value) })}
                  >
                    {[6, 12, 18, 24, 30, 36, 48].map((m) => (
                      <option key={m} value={m}>
                        {m} meses
                      </option>
                    ))}
                  </select>
                </label>
                <MoneyInput label="Multa rescisória" value={terms.releaseClause} onChange={(v) => setTerms({ ...terms, releaseClause: v })} />
              </div>
              <p className="text-xs text-muted">
                Multa entre {money(value * MARKET.clauseMultMin)} e {money(value * MARKET.clauseMultMax)}. Restam {roundsLeft} propostas.
              </p>
            </>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {!finished && (
              <button
                type="button"
                onClick={() => {
                  const abandoned = abandonNegotiation(neg);
                  if (abandoned) commit(abandoned);
                  onClose();
                }}
                className={`${btn} border border-line text-muted hover:text-ink`}
                title="Depois de fazer uma proposta, desistir piora a relação com o time."
              >
                Desistir
              </button>
            )}
            {neg.phase === 'club' && (
              <button type="button" onClick={() => apply(offerClub(w, neg, fee))} className={`${btn} bg-accent text-black hover:brightness-110`}>
                Enviar proposta
              </button>
            )}
            {neg.phase === 'player' && (
              <button type="button" onClick={() => apply(offerPlayer(w, neg, terms))} className={`${btn} bg-accent text-black hover:brightness-110`}>
                Enviar proposta
              </button>
            )}
            {finished && (
              <button type="button" onClick={close} className={`${btn} ${neg.phase === 'done' ? 'bg-win text-black' : 'bg-panel-2 text-ink'}`}>
                {neg.phase === 'done' ? 'Concluir' : 'Fechar'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
