import { formatDate } from '../engine/date';
import { useGame, useWorld } from '../store/game';
import { TeamBadge } from './TeamBadge';

/** Aba de notícias no estilo HLTV: manchetes por dia, rumores marcados. */
export function NewsPanel() {
  const w = useWorld();
  const me = useGame((s) => s.myTeamId);
  const news = w.news ?? [];
  if (!news.length)
    return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">Nenhuma notícia ainda. Avance o tempo: transferências, títulos e rumores aparecem aqui.</p>;
  const days = [...new Set(news.map((n) => n.date))];
  return (
    <div className="space-y-5">
      {days.map((d) => (
        <section key={d}>
          <h3 className="mb-1 text-sm font-semibold text-muted">{formatDate(d)}</h3>
          <ul className="overflow-hidden rounded-2xl border border-line bg-panel">
            {news
              .filter((n) => n.date === d)
              .map((n) => {
                const mine = !!me && n.teamIds.includes(me);
                const team = w.teams[n.teamIds[0]];
                return (
                  <li key={n.id} className={`flex items-center gap-3 border-t border-line/60 px-4 py-2.5 first:border-t-0 ${mine ? 'bg-accent/10' : ''}`}>
                    {team ? <TeamBadge team={team} size={22} /> : <span className="w-[22px]" />}
                    <p className="min-w-0 flex-1 text-sm">
                      {n.rumor && <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-muted">Rumor</span>}
                      {n.title}
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
