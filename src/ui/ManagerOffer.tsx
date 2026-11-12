import { formatDate } from '../engine/date';
import { seasonGoals } from '../engine/manager/board';
import { offerInjection } from '../engine/manager/offers';
import type { InboxItem } from '../engine/world';
import { useGame, useWorld } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

const btn = 'rounded-lg px-3 py-1.5 text-sm font-semibold transition';

/** Proposta de um time para você ser o manager. */
export function ManagerOfferItem({ item }: { item: InboxItem }) {
  const w = useWorld();
  const accept = useGame((s) => s.acceptManagerOffer);
  const decline = useGame((s) => s.declineManagerOffer);
  const askBudget = useGame((s) => s.askBoardBudget);
  const team = w.teams[item.offerTeamId!];
  if (!team) return null;
  const employed = !!w.managerTeamId;
  return (
    <li className="rounded-xl border border-accent/40 bg-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <TeamBadge team={team} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{team.name} quer você como manager</p>
          <p className="text-xs text-muted">
            #{team.hltvRank} no ranking · responder até {formatDate(item.expires)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm">
        Salário de {money(item.askedSalary ?? 0)}/mês e aporte de {money(offerInjection(team))} no caixa ao chegar. Você assume o elenco como está.
      </p>
      <ul className="mt-1 text-sm text-muted">
        {seasonGoals(team).map((g) => (
          <li key={g.kind}>Meta: {g.text}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btn} bg-accent text-black`}
          onClick={() => (!employed || window.confirm(`Deixar o seu time para assumir a ${team.name}?`)) && accept(item.id)}
        >
          Aceitar
        </button>
        {employed && (
          <button
            type="button"
            className={`${btn} border border-accent/50 text-accent`}
            title="A diretoria pode dar um aporte para você ficar (mais provável com confiança alta); se negar, a confiança cai."
            onClick={() => askBudget(item.id)}
          >
            Pedir mais orçamento
          </button>
        )}
        <button type="button" className={`${btn} border border-line text-muted hover:text-ink`} onClick={() => decline(item.id)}>
          Recusar
        </button>
      </div>
    </li>
  );
}
