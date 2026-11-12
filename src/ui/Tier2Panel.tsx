import { TIER2 } from '../engine/config';
import { managerOrg } from '../engine/manager/model';
import { tier2Ranking } from '../engine/tier2/cups';
import { academyTeamId, tier2Teams } from '../engine/tier2/model';
import { useWorld } from '../store/game';
import { TeamBadge } from './TeamBadge';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Próxima copa: dia 5 do mês que vem (fevereiro a novembro). */
function nextCupLabel(date: string): string {
  let y = Number(date.slice(0, 4));
  let m = Number(date.slice(5, 7));
  if (Number(date.slice(8, 10)) >= Number(TIER2.cupDay)) m++;
  if (m > TIER2.lastMonth) {
    m = TIER2.firstMonth;
    y++;
  }
  if (m < TIER2.firstMonth) m = TIER2.firstMonth;
  return `5 de ${MONTHS[m - 1]} de ${y}`;
}

export function Tier2Panel() {
  const w = useWorld();
  const org = managerOrg(w);
  const mine = org ? academyTeamId(org) : null;
  const teams = tier2Teams(w);
  const ranking = tier2Ranking(w);
  const cup = w.tier2.cup;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section>
        <h2 className="font-display mb-2 text-lg font-bold">{cup ? cup.name : 'Tier 2 Cup'}</h2>
        {cup ? (
          <>
            <p className="mb-2 text-sm text-muted">
              Dia {cup.day} · {cup.participants.length} times no suíço, com playoffs. Pontos no ranking: campeão 100, vice 70, semifinal 50, quartas 30.
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {cup.participants.map((id) => {
                const t = teams[id];
                const place = cup.placements[id];
                return (
                  <li key={id} className={`flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm ${id === mine ? 'bg-accent/10' : 'bg-panel'}`}>
                    {t && <TeamBadge team={t} size={20} />}
                    <span className={`min-w-0 flex-1 truncate ${id === mine ? 'font-semibold text-accent' : ''}`}>{t?.name ?? id}</span>
                    <span className={`text-xs ${place ? 'text-muted' : 'text-win'}`}>{place ?? 'na disputa'}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">
            Nenhuma copa em andamento. A próxima começa em {nextCupLabel(w.date)}, com os 16 primeiros do ranking (a sua academy entra sempre).
          </p>
        )}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-display text-lg font-bold">Ranking do tier 2 {w.tier2.season}</h2>
          <span className="text-xs text-muted">zera em janeiro</span>
        </div>
        <ol className="overflow-hidden rounded-2xl border border-line bg-panel text-sm">
          {ranking.map((r, i) => (
            <li
              key={r.teamId}
              className={`flex items-center gap-2 px-3 py-1.5 ${i === 8 ? 'border-t-2 border-accent/60' : 'border-t border-line/60'} first:border-t-0 ${r.teamId === mine ? 'bg-accent/10' : ''}`}
              title={i === 8 ? 'Acima desta linha: top 8' : undefined}
            >
              <span className="w-6 tabular-nums text-muted">{i + 1}</span>
              {teams[r.teamId] && <TeamBadge team={teams[r.teamId]} size={18} />}
              <span className={`min-w-0 flex-1 truncate ${r.teamId === mine ? 'font-semibold text-accent' : ''}`}>{r.name}</span>
              <span className="w-12 text-right tabular-nums">{r.points}</span>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-muted">A linha mais forte separa o top 8.</p>
      </section>
    </div>
  );
}
