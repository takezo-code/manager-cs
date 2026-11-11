import { onVacation, windowOpen } from '../engine/calendar';
import { formatDate } from '../engine/date';
import { useGame } from '../store/game';

/** Controle único do tempo: avança o calendário inteiro (eventos, mercado, finanças). */
export function TimeBar() {
  const date = useGame((s) => s.date);
  const advance = useGame((s) => s.advance);
  const open = windowOpen(date);
  const btn = 'rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:border-white/30 hover:text-ink';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3">
      <span className="font-display text-xl font-bold">{formatDate(date)}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? 'bg-win/15 text-win' : 'bg-white/5 text-muted'}`}>
        {open ? 'Janela de transferências aberta' : onVacation(date) ? 'Férias' : 'Mercado fechado (só agentes livres)'}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => advance(1)}>
          +1 dia
        </button>
        <button type="button" className={btn} onClick={() => advance(7)}>
          +1 semana
        </button>
        <button
          type="button"
          onClick={() => advance('jogo')}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110"
          title="Avança até o próximo jogo do seu time ou até chegar algo novo na caixa de entrada (no máximo 60 dias)."
        >
          Até o próximo jogo
        </button>
      </div>
    </div>
  );
}
