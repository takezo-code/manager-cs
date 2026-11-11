import { formatDate } from '../engine/date';
import { useGame } from '../store/game';
import { TeamBadge } from './TeamBadge';

export function RankingPanel() {
  const teams = useGame((s) => s.teams);
  const me = useGame((s) => s.myTeamId)!;
  const list = Object.values(teams).sort((a, b) => a.hltvRank - b.hltvRank);
  const updated = list[0]?.rankHistory.at(-1)?.date;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Atualizado toda segunda-feira{updated ? ` (último: ${formatDate(updated)})` : ''}. Pontos vêm das conquistas dos últimos 12 meses, da forma
        recente e das últimas 10 LANs. Um time só leva os pontos se mantiver 3 dos 5 titulares.
      </p>
      <ol className="overflow-hidden rounded-2xl border border-line bg-panel">
        {list.map((t) => {
          const hist = t.rankHistory;
          const prev = hist.length >= 2 ? hist[hist.length - 2].rank : null;
          const diff = prev === null ? 0 : prev - t.hltvRank;
          return (
            <li key={t.id} className={`flex items-center gap-3 border-t border-line/60 px-4 py-2 first:border-t-0 ${t.id === me ? 'bg-accent/10' : ''}`}>
              <span className="font-display w-8 text-xl font-bold text-muted tabular-nums">{t.hltvRank}</span>
              <span className={`w-8 text-xs font-semibold tabular-nums ${diff > 0 ? 'text-win' : diff < 0 ? 'text-loss' : 'text-muted'}`}>
                {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '–'}
              </span>
              <TeamBadge team={t} size={26} />
              <span className={`min-w-0 flex-1 truncate font-semibold ${t.id === me ? 'text-accent' : ''}`}>{t.name}</span>
              <span className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-black/40 sm:block" aria-hidden>
                <span className="block h-full bg-accent/70" style={{ width: `${t.hltvPoints / 10}%` }} />
              </span>
              <span className="font-display w-14 text-right text-lg font-bold tabular-nums">{t.hltvPoints}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
