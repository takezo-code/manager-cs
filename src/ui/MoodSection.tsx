import { useState } from 'react';
import { formatDate } from '../engine/date';
import { bandOf } from '../engine/morale/satisfaction';
import type { Player } from '../engine/types';
import { useGame } from '../store/game';
import { MoodTag } from './FinancePanel';

/** Satisfação do jogador e ações de salário (aumento por iniciativa e redução individual). */
export function MoodSection({ player }: { player: Player }) {
  const raise = useGame((s) => s.raiseSalary);
  const cut = useGame((s) => s.proposeSalaryCut);
  const date = useGame((s) => s.date);
  const [pct, setPct] = useState(10);
  const band = bandOf(player.satisfaction);
  const barColor = band === 'satisfeito' ? 'bg-win' : band === 'incomodado' ? 'bg-accent' : 'bg-loss';
  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold">Satisfação</h3>
        <MoodTag band={band} value={player.satisfaction} />
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40" role="meter" aria-valuenow={player.satisfaction} aria-valuemin={0} aria-valuemax={100} aria-label="Satisfação">
        <div className={`h-full ${barColor}`} style={{ width: `${player.satisfaction}%` }} />
      </div>
      {player.mood.promiseUntil && player.mood.promiseUntil >= date && (
        <p className="mt-2 text-xs text-accent">Você prometeu titularidade até {formatDate(player.mood.promiseUntil)}.</p>
      )}
      {player.mood.exitDenied && <p className="mt-2 text-xs text-loss">Saída negada: fica até o fim do contrato, rende menos e não renova.</p>}
      {player.mood.salaryBeforeCut && <p className="mt-2 text-xs text-muted">Teve o salário reduzido e espera a volta quando o time melhorar.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <select className="rounded-lg border border-line bg-panel-2 px-2 py-1.5" value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Percentual">
          {[10, 20, 30].map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
        <button type="button" onClick={() => raise(player.id, pct)} className="rounded-lg border border-win/50 px-3 py-1.5 text-win hover:bg-win/10">
          Dar aumento
        </button>
        <button type="button" onClick={() => cut([player.id], pct)} className="rounded-lg border border-loss/50 px-3 py-1.5 text-loss hover:bg-loss/10">
          Propor redução
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Aumento por iniciativa agrada mais que atender pedido, mas pode gerar ciúme. Redução nunca é imposta: ele pode recusar.</p>
    </section>
  );
}
