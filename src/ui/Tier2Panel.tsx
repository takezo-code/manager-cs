import { managerOrg } from '../engine/manager/model';
import { academyTeam, academyTeamId, orgOfAcademy } from '../engine/tier2/model';
import { academyRanking } from '../engine/tier2/ranking';
import type { CalendarEvent } from '../engine/calendar';
import type { Team } from '../engine/types';
import type { World } from '../engine/world';
import { useWorld } from '../store/game';
import { formatDate } from '../engine/date';
import { TeamBadge } from './TeamBadge';

const teamOf = (w: World, id: string): Team | undefined => w.teams[id] ?? (orgOfAcademy(id) && w.teams[orgOfAcademy(id)!] ? academyTeam(w, orgOfAcademy(id)!) : undefined);

function EventCard({ ev, mine }: { ev: CalendarEvent; mine: string[] }) {
  const w = useWorld();
  const t = ev.tournament;
  const ids = t?.participants ?? ev.accepted;
  return (
    <li className="rounded-2xl border border-line bg-panel p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-semibold">{ev.name}</h3>
        <span className="text-xs text-muted">
          Tier {ev.tier} · {formatDate(ev.startDate)} a {formatDate(ev.endDate)} · {ev.teams} times
        </span>
      </div>
      {t?.championId ? (
        <p className="mt-1 text-sm">Campeão: {teamOf(w, t.championId)?.name ?? t.championId}</p>
      ) : ids.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const team = teamOf(w, id);
            const out = t?.placements[id];
            return (
              <li key={id} className={`flex items-center gap-1.5 rounded-lg border border-line px-2 py-0.5 text-xs ${mine.includes(id) ? 'bg-accent/10 font-semibold text-accent' : ''} ${out ? 'opacity-50' : ''}`}>
                {team && <TeamBadge team={team} size={14} />}
                {team?.shortName ?? id}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">Convites saem 21 dias antes.</p>
      )}
    </li>
  );
}

export function Tier2Panel() {
  const w = useWorld();
  const org = managerOrg(w);
  const mine = org ? [org, academyTeamId(org)] : [];
  const region = org ? w.teams[org]?.region : undefined;
  // Eventos tier 2/3 abertos ou próximos da região do seu time (ou de que você participa).
  const events = w.calendar
    .filter((e) => (e.tier ?? 1) > 1 && e.status !== 'encerrado')
    .filter((e) => !e.regions || !region || e.regions.includes(region) || mine.some((id) => e.accepted.includes(id) || e.tournament?.participants.includes(id)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8);
  const ranking = academyRanking(w).slice(0, 20);
  const myAcademy = org ? academyTeamId(org) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section>
        <h2 className="font-display mb-2 text-lg font-bold">Circuito tier 2 e tier 3</h2>
        <p className="mb-2 text-sm text-muted">
          Tier 2 vale 1/4 dos pontos de ranking de um evento grande; tier 3, 1/10. Academies entram no tier 3 da região quando sobra vaga.
        </p>
        {events.length ? (
          <ul className="grid gap-2">
            {events.map((e) => (
              <EventCard key={e.id} ev={e} mine={mine} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">Nenhum evento tier 2/3 marcado por enquanto. O calendário do ano que vem sai em janeiro.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-display text-lg font-bold">Academies no tier 3 {w.date.slice(0, 4)}</h2>
          <span className="text-xs text-muted">zera em janeiro</span>
        </div>
        <ol className="overflow-hidden rounded-2xl border border-line bg-panel text-sm">
          {ranking.map((r, i) => {
            const team = teamOf(w, r.teamId);
            return (
              <li
                key={r.teamId}
                className={`flex items-center gap-2 px-3 py-1.5 ${i === 8 ? 'border-t-2 border-accent/60' : 'border-t border-line/60'} first:border-t-0 ${r.teamId === myAcademy ? 'bg-accent/10' : ''}`}
                title={i === 8 ? 'Acima desta linha: top 8' : undefined}
              >
                <span className="w-6 tabular-nums text-muted">{i + 1}</span>
                {team && <TeamBadge team={team} size={18} />}
                <span className={`min-w-0 flex-1 truncate ${r.teamId === myAcademy ? 'font-semibold text-accent' : ''}`}>{r.name}</span>
                <span className="w-10 text-right text-xs tabular-nums text-muted">{r.events}</span>
                <span className="w-12 text-right tabular-nums">{r.points}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-xs text-muted">Eventos jogados e pontos (campeão 100, vice 70, semifinal 50, demais 20). A linha mais forte separa o top 8.</p>
      </section>
    </div>
  );
}
