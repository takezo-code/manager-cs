// Painel Início: o que importa hoje numa tela só.
import { useMemo, useState, type ReactNode } from 'react';
import type { CalendarEvent } from '../../engine/calendar';
import { addDays, daysBetween, formatDate } from '../../engine/date';
import { payroll, sponsorIncome } from '../../engine/finance/monthly';
import { playerOvr } from '../../engine/player';
import { myMatchToday } from '../../engine/schedule';
import { rivalPreview } from '../../engine/staff/preview';
import { withAcademyTeams } from '../../engine/tier2/model';
import { MAP_NAMES } from '../../engine/config';
import { useGame, useWorld } from '../../store/game';
import { TeamBadge } from '../TeamBadge';
import { money, ROLE_LABEL } from '../format';

export type HomeLink = 'elenco' | 'partidas' | 'ranking' | 'midia' | 'carreira';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function Card({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col rounded-xl border border-line bg-panel p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-line/70 pb-2">
        <h2 className="font-display shrink-0 text-[15px] font-bold tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkBtn = 'text-xs font-semibold text-muted hover:text-accent';

const involves = (e: CalendarEvent, id: string) =>
  e.accepted.includes(id) || e.qualified.includes(id) || !!e.tournament?.participants.includes(id);

/** Próximo jogo do seu time: amanhã (dia de jogo) ou o próximo evento confirmado. */
function NextMatch({ onPlay, go }: { onPlay: () => void; go: (l: HomeLink) => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const advance = useGame((s) => s.advance);
  const match = myMatchToday(w);
  const teams = match ? withAcademyTeams(w, [match.teamAId, match.teamBId]) : w.teams;
  const upcoming = w.calendar
    .filter((e) => e.status !== 'encerrado' && involves(e, me) && !e.tournament?.placements[me])
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const invite = w.calendar.find((e) => e.status === 'convites' && e.invited.includes(me) && !e.accepted.includes(me) && !e.declined.includes(me));

  if (!match) {
    return (
      <Card title="Próxima partida" action={<button className={linkBtn} onClick={() => go('partidas')}>Calendário</button>}>
        <div className="flex flex-1 flex-col justify-center gap-2 py-4 text-center">
          {upcoming ? (
            <>
              <p className="font-display text-xl font-bold">{upcoming.name}</p>
              <p className="text-sm text-muted">
                {upcoming.status === 'em_andamento' ? 'Seu time está jogando; o próximo jogo ainda vai ser sorteado.' : `Começa em ${formatDate(upcoming.startDate)}, daqui a ${Math.max(0, daysBetween(w.date, upcoming.startDate))} dias.`}
              </p>
            </>
          ) : invite ? (
            <p className="text-sm">
              Convite para <b>{invite.name}</b> esperando resposta. Responda no calendário.
            </p>
          ) : (
            <p className="text-sm text-muted">Nenhum evento confirmado. Os convites saem 21 dias antes, pelo ranking.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-md bg-panel-2 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => go('elenco')}>
            Treino
          </button>
          <button className="rounded-md bg-accent py-2 text-sm font-bold text-black hover:brightness-110" onClick={() => advance('jogo')}>
            Continuar
          </button>
        </div>
      </Card>
    );
  }

  const rivalId = match.teamAId === me ? match.teamBId : match.teamAId;
  const preview = rivalPreview(w, rivalId, match.seriesId);
  const Side = ({ id }: { id: string }) => (
    <div className="flex w-28 flex-col items-center gap-1.5 text-center">
      <TeamBadge team={teams[id]} size={56} />
      <span className={`font-display text-base leading-tight font-bold ${id === me ? 'text-accent' : ''}`}>{teams[id].name}</span>
      <span className="text-[11px] text-muted">{w.teams[id] ? `#${w.teams[id].hltvRank} HLTV` : 'Academy'}</span>
    </div>
  );
  return (
    <Card title="Próxima partida" action={<span className="truncate text-right text-xs text-muted">{match.eventName}</span>}>
      <div className="flex items-center justify-around py-2">
        <Side id={match.teamAId} />
        <div className="text-center">
          <div className="font-display text-3xl font-bold text-muted">VS</div>
          <div className="mt-1 rounded bg-panel-2 px-2 py-0.5 text-xs font-semibold">{match.format}</div>
        </div>
        <Side id={match.teamBId} />
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Amanhã, {formatDate(addDays(w.date, 1))}. Analista: rival forte em {preview.strong.map((m) => MAP_NAMES[m]).join(' e ')}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-md bg-panel-2 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => go('elenco')}>
          Escalação e treino
        </button>
        <button className="rounded-md bg-win py-2 text-sm font-bold text-black hover:brightness-110" onClick={onPlay}>
          Ir para o jogo
        </button>
      </div>
    </Card>
  );
}

function Starters({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const team = w.teams[w.managerTeamId];
  const ids = team.starters;
  const energy = Math.round(ids.reduce((s, id) => s + w.players[id].energy, 0) / Math.max(1, ids.length));
  return (
    <Card title="Seu time" action={<button className={linkBtn} onClick={() => go('elenco')}>Gerenciar</button>}>
      <div className="grid grid-cols-5 gap-2">
        {ids.map((id) => {
          const p = w.players[id];
          return (
            <button key={id} onClick={() => go('elenco')} className="group rounded-lg bg-panel-2 p-2 text-center transition hover:bg-white/10">
              <div className="font-display text-2xl leading-none font-bold text-accent">{playerOvr(p)}</div>
              <div className="mt-1 truncate text-sm font-semibold">{p.nick}</div>
              <div className="truncate text-[11px] text-muted">{ROLE_LABEL[p.role]}</div>
              <div className="mt-1.5 h-1 overflow-hidden rounded bg-black/40" title={`Energia ${Math.round(p.energy)}`}>
                <div className={`h-full ${p.energy < 50 ? 'bg-loss' : 'bg-win'}`} style={{ width: `${p.energy}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Energia média {energy} · {team.playerIds.length - ids.length} reserva(s) · #{team.hltvRank} no ranking HLTV
      </p>
    </Card>
  );
}

function Cash({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const team = w.teams[w.managerTeamId];
  const income = sponsorIncome(team, w.date);
  const out = payroll(w, team);
  const net = income - out;
  return (
    <Card title="Caixa" action={<button className={linkBtn} onClick={() => go('carreira')}>Finanças</button>}>
      <div className="font-display text-4xl font-bold">{money(team.money)}</div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Patrocínio por mês</dt>
          <dd>{money(income)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Folha por mês</dt>
          <dd>{money(out)}</dd>
        </div>
        <div className="flex justify-between border-t border-line/70 pt-1.5">
          <dt className="text-muted">Saldo do mês</dt>
          <dd className={net >= 0 ? 'text-win' : 'text-loss'}>
            {net >= 0 ? '+' : '−'} {money(Math.abs(net))}
          </dd>
        </div>
      </dl>
      {team.lateMonths > 0 && <p className="mt-2 rounded bg-loss/15 px-2 py-1 text-xs text-loss">Salários atrasados há {team.lateMonths} mês(es).</p>}
    </Card>
  );
}

function MonthCalendar({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const [offset, setOffset] = useState(0);
  const base = new Date(`${w.date}T00:00:00Z`);
  const first = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const iso = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const mine = w.calendar.filter((e) => involves(e, me) || e.invited.includes(me));
  const tier1 = w.calendar.filter((e) => (e.tier ?? 1) === 1);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <Card
      title={`${MONTHS[m]} ${y}`}
      action={
        <span className="flex gap-1">
          <button className="rounded px-2 text-muted hover:text-ink" aria-label="Mês anterior" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          <button className="rounded px-2 text-muted hover:text-ink" aria-label="Próximo mês" onClick={() => setOffset(offset + 1)}>
            ›
          </button>
        </span>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1 text-muted">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const date = iso(d);
          const my = mine.find((e) => e.startDate <= date && date <= e.endDate);
          const big = tier1.find((e) => e.startDate <= date && date <= e.endDate);
          const today = date === w.date;
          return (
            <button
              key={i}
              onClick={() => go('partidas')}
              title={my?.name ?? big?.name}
              className={`aspect-square rounded-md text-[13px] transition hover:bg-white/10 ${my ? 'bg-accent/25 font-bold text-accent' : big ? 'bg-ct/15' : ''} ${today ? 'ring-2 ring-ink' : ''}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent/60" />
          seu time
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-ct/40" />
          tier 1
        </span>
      </div>
    </Card>
  );
}

function Tweets({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const feed = (w.feed ?? []).slice(0, 4);
  return (
    <Card title="Tweets" action={<button className={linkBtn} onClick={() => go('midia')}>Ver tudo</button>}>
      {feed.length ? (
        <ul className="divide-y divide-line/60">
          {feed.map((t) => (
            <li key={t.id} className="py-2 text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold">{t.author.name}</span>
                <span className="truncate text-xs text-muted">{t.author.handle.startsWith('@') ? t.author.handle : `@${t.author.handle}`}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">{t.date === w.date ? 'hoje' : formatDate(t.date)}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink/90">{t.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">A torcida ainda não falou nada. Os tuítes chegam com os jogos e as transferências.</p>
      )}
    </Card>
  );
}

function Table({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const [view, setView] = useState<'ranking' | 'evento'>('ranking');
  const ranked = useMemo(() => Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank), [w.teams]);
  const live = w.calendar.find((e) => e.status === 'em_andamento' && e.tournament?.participants.includes(me));
  const myRank = w.teams[me].hltvRank;
  const window = ranked.slice(Math.max(0, Math.min(myRank - 4, ranked.length - 8)), Math.max(8, Math.min(myRank + 4, ranked.length)));
  const rows = view === 'ranking' || !live ? (myRank <= 8 ? ranked.slice(0, 8) : [...ranked.slice(0, 3), ...window.slice(-5)]) : null;
  const eventTeams = live ? withAcademyTeams(w, live.tournament!.participants) : null;
  return (
    <Card
      title={view === 'evento' && live ? live.name : 'Ranking HLTV'}
      action={
        <span className="flex gap-1 text-xs">
          <button className={`rounded px-2 py-0.5 ${view === 'ranking' ? 'bg-panel-2 text-ink' : 'text-muted'}`} onClick={() => setView('ranking')}>
            Ranking
          </button>
          <button disabled={!live} className={`rounded px-2 py-0.5 disabled:opacity-40 ${view === 'evento' ? 'bg-panel-2 text-ink' : 'text-muted'}`} onClick={() => setView('evento')}>
            Seu evento
          </button>
        </span>
      }
    >
      {rows ? (
        <ol className="text-sm">
          {rows.map((t) => (
            <li key={t.id} className={`flex items-center gap-3 rounded px-2 py-1.5 ${t.id === me ? 'bg-accent/15 font-semibold text-accent' : ''}`}>
              <span className="w-6 text-right text-muted tabular-nums">{t.hltvRank}</span>
              <TeamBadge team={t} size={18} />
              <span className="min-w-0 flex-1 truncate">{t.name}</span>
              <span className="text-muted tabular-nums">{t.hltvPoints}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="text-sm">
          {live!.tournament!.participants.map((id) => {
            const place = live!.tournament!.placements[id];
            return (
              <li key={id} className={`flex items-center gap-3 rounded px-2 py-1.5 ${id === me ? 'bg-accent/15 font-semibold text-accent' : ''} ${place ? 'opacity-50' : ''}`}>
                <TeamBadge team={eventTeams![id]} size={18} />
                <span className="min-w-0 flex-1 truncate">{eventTeams![id].name}</span>
                <span className="text-xs text-muted">{place ?? 'vivo'}</span>
              </li>
            );
          })}
        </ul>
      )}
      <button className={`${linkBtn} mt-auto pt-3 text-left`} onClick={() => go('ranking')}>
        Ranking completo
      </button>
    </Card>
  );
}

export function Home({ onPlay, go }: { onPlay: () => void; go: (l: HomeLink) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 [&>*]:flex [&>*>section]:flex-1">
      <div className="lg:col-span-4">
        <NextMatch onPlay={onPlay} go={go} />
      </div>
      <div className="lg:col-span-5">
        <Starters go={go} />
      </div>
      <div className="lg:col-span-3">
        <Cash go={go} />
      </div>
      <div className="lg:col-span-4">
        <MonthCalendar go={go} />
      </div>
      <div className="lg:col-span-4">
        <Tweets go={go} />
      </div>
      <div className="lg:col-span-4">
        <Table go={go} />
      </div>
    </div>
  );
}
