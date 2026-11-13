// Painel Início: cards no estilo de painel de manager (próxima partida, time, dinheiro, calendário, tweets, tabela).
import { useMemo, useState, type ReactNode } from 'react';
import type { CalendarEvent } from '../../engine/calendar';
import { addDays, daysBetween, formatDate } from '../../engine/date';
import { payroll, sponsorIncome } from '../../engine/finance/monthly';
import { playerOvr } from '../../engine/player';
import { myMatchToday } from '../../engine/schedule';
import { rivalPreview } from '../../engine/staff/preview';
import { MAP_NAMES } from '../../engine/config';
import { hashString } from '../../engine/rng';
import type { Team } from '../../engine/types';
import type { World } from '../../engine/world';
import { useGame, useWorld } from '../../store/game';
import { TeamBadge } from '../TeamBadge';
import { money } from '../format';

export type HomeLink = 'elenco' | 'partidas' | 'ranking' | 'midia' | 'carreira' | 'academy' | 'mensagens';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ROLE_SHORT: Record<string, string> = { IGL: 'IGL', AWPER: 'AWP', ENTRY: 'ENTRY', SUPPORT: 'SUP', LURKER: 'LURK' };

/** Card do painel: título em caixa alta, linha fina e conteúdo. */
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-1 flex-col rounded-md border border-white/10 bg-[#121722]/85 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <h2 className="font-display shrink-0 text-[13px] font-bold tracking-[0.12em] uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkBtn = 'text-[11px] font-semibold tracking-wider text-muted uppercase hover:text-ink';
const actionBtn = 'font-display rounded-sm py-2 text-xs font-bold tracking-[0.12em] uppercase transition';

const involves = (e: CalendarEvent, id: string) =>
  e.accepted.includes(id) || e.qualified.includes(id) || !!e.tournament?.participants.includes(id);

/** Vitórias e derrotas em séries na temporada. */
function seasonRecord(w: World, teamId: string): { v: number; d: number } {
  const year = w.date.slice(0, 4);
  let v = 0;
  let d = 0;
  for (const s of w.seriesLog) {
    if (!s.date.startsWith(year)) continue;
    if (s.winner === teamId) v++;
    else if (s.loser === teamId) d++;
  }
  return { v, d };
}

function MatchSide({ team, me }: { team: Team; me: boolean }) {
  const w = useWorld();
  const r = seasonRecord(w, team.id);
  return (
    <div className="flex w-32 flex-col items-center gap-2 text-center">
      <TeamBadge team={team} size={64} />
      <span className={`font-display text-sm leading-tight font-bold tracking-wider uppercase ${me ? 'text-accent' : ''}`}>{team.name}</span>
      <span className="text-[11px] text-muted tabular-nums">
        {team.hltvRank}º · {r.v}V {r.d}D
      </span>
    </div>
  );
}

function NextMatch({ onPlay, go }: { onPlay: () => void; go: (l: HomeLink) => void }) {
  const w = useWorld();
  const me = w.managerTeamId;
  const advance = useGame((s) => s.advance);
  const match = myMatchToday(w);
  const upcoming = w.calendar
    .filter((e) => e.status !== 'encerrado' && involves(e, me) && !e.tournament?.placements[me])
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const invite = w.calendar.find((e) => e.status === 'convites' && e.invited.includes(me) && !e.accepted.includes(me) && !e.declined.includes(me));

  const buttons = (
    <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
      <button className={`${actionBtn} bg-white/10 hover:bg-white/15`} onClick={() => go('elenco')}>
        Treino
      </button>
      <button className={`${actionBtn} bg-white/10 hover:bg-white/15 disabled:opacity-40`} disabled={!!match} onClick={() => advance(1)}>
        Avançar dia
      </button>
      <button className={`${actionBtn} bg-ink text-black hover:bg-white`} onClick={() => (match ? onPlay() : advance('jogo'))}>
        {match ? 'Jogar' : 'Continuar'}
      </button>
    </div>
  );

  if (!match)
    return (
      <Card title="Próxima partida" action={<button className={linkBtn} onClick={() => go('partidas')}>Calendário</button>}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
          {upcoming ? (
            <>
              <p className="font-display text-lg font-bold tracking-wide uppercase">{upcoming.name}</p>
              <p className="text-sm text-muted">
                {upcoming.status === 'em_andamento'
                  ? 'Seu time está no evento; o próximo jogo ainda vai ser sorteado.'
                  : `Começa em ${formatDate(upcoming.startDate)} (${Math.max(0, daysBetween(w.date, upcoming.startDate))} dias).`}
              </p>
            </>
          ) : invite ? (
            <p className="text-sm">
              Convite para <b>{invite.name}</b> esperando resposta no calendário.
            </p>
          ) : (
            <p className="text-sm text-muted">Nenhum evento confirmado. Os convites saem 21 dias antes, pelo ranking.</p>
          )}
        </div>
        {buttons}
      </Card>
    );

  const rivalId = match.teamAId === me ? match.teamBId : match.teamAId;
  const preview = rivalPreview(w, rivalId, match.seriesId);
  return (
    <Card
      title="Próxima partida"
      action={
        <span className="truncate text-right text-[11px] leading-tight font-semibold tracking-wider text-muted uppercase">
          {match.eventName}
          <br />
          {match.format} · {match.stage === 'grupos' ? 'grupos' : match.stage}
        </span>
      }
    >
      <div className="flex items-center justify-around py-1">
        <MatchSide team={w.teams[match.teamAId]} me={match.teamAId === me} />
        <span className="font-display text-2xl font-bold text-muted">VS</span>
        <MatchSide team={w.teams[match.teamBId]} me={match.teamBId === me} />
      </div>
      <p className="mt-3 border-t border-white/10 pt-2 text-center text-[11px] text-muted">
        Amanhã, {formatDate(addDays(w.date, 1))} · analista: rival forte em {preview.strong.map((m) => MAP_NAMES[m]).join(' e ')}
      </p>
      {buttons}
    </Card>
  );
}

/** Estrelas do time (0,5 em 0,5) pela média de OVR dos titulares. */
function Stars({ ovr }: { ovr: number }) {
  const v = Math.max(0.5, Math.min(5, Math.round(((ovr - 66) / 4) * 2) / 2));
  return (
    <span className="text-sm tracking-tight text-accent" title={`OVR médio ${Math.round(ovr)}`}>
      {Array.from({ length: 5 }, (_, i) => (i + 1 <= v ? '★' : i + 0.5 === v ? '⯪' : '☆')).join('')}
    </span>
  );
}

function YourTeam({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const team = w.teams[w.managerTeamId];
  const inbox = w.inbox.length;
  const starters = team.starters.map((id) => w.players[id]).filter(Boolean);
  const avg = starters.reduce((s, p) => s + playerOvr(p), 0) / Math.max(1, starters.length);
  return (
    <Card title="Seu time" action={<Stars ovr={avg} />}>
      <div className="mb-3 flex items-center gap-2">
        <TeamBadge team={team} size={22} />
        <span className="font-display flex-1 truncate text-sm font-bold tracking-wider uppercase">{team.name}</span>
        <button className={`${actionBtn} relative bg-white/10 px-2.5 hover:bg-white/15`} onClick={() => go('mensagens')} title="Mensagens">
          ✉{inbox > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1 text-[9px] text-black">{inbox}</span>}
        </button>
        <button className={`${actionBtn} bg-white/10 px-3 hover:bg-white/15`} onClick={() => go('academy')}>
          Academy
        </button>
        <button className={`${actionBtn} bg-white/10 px-3 hover:bg-white/15`} onClick={() => go('elenco')}>
          Gerenciar
        </button>
      </div>
      <div className="grid flex-1 grid-cols-5 gap-1.5">
        {starters.map((p) => (
          <button
            key={p.id}
            onClick={() => go('elenco')}
            className="group relative flex flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-b from-[#2a3346] to-[#151b27] pt-14 pb-2 text-center"
            title={`${p.nick} · OVR ${playerOvr(p)}`}
          >
            {/* Silhueta no lugar da foto */}
            <span aria-hidden className="absolute top-3 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-white/10" />
            <span aria-hidden className="absolute top-12 left-1/2 h-10 w-16 -translate-x-1/2 rounded-t-[2rem] bg-white/10" />
            <span className="absolute top-1.5 right-1.5 text-[11px] font-bold text-accent tabular-nums">{playerOvr(p)}</span>
            <span className="relative text-[10px] font-semibold tracking-wider text-muted">{ROLE_SHORT[p.role] ?? p.role}</span>
            <span className="font-display relative truncate px-1 text-[13px] font-bold tracking-wide uppercase group-hover:text-accent">{p.nick}</span>
            <span className={`absolute inset-x-0 bottom-0 h-0.5 ${p.energy < 50 ? 'bg-loss' : 'bg-win/70'}`} />
          </button>
        ))}
      </div>
    </Card>
  );
}

function Cash({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const team = w.teams[w.managerTeamId];
  const income = sponsorIncome(team, w.date);
  const players = team.playerIds.reduce((s, id) => s + (w.players[id]?.contract?.salary ?? 0), 0);
  const costs = payroll(w, team) - players;
  return (
    <Card title="Dinheiro disponível">
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-2xl">💰</span>
        <span className="font-display text-3xl font-bold tabular-nums">{money(team.money)}</span>
      </div>
      <dl className="mt-4 space-y-2 border-t border-white/10 pt-3 text-[12px] tracking-wide uppercase">
        <div className="flex justify-between">
          <dt className="text-muted">Salários / mês</dt>
          <dd className="font-semibold tabular-nums">{money(players)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Custos do time</dt>
          <dd className="font-semibold tabular-nums">{money(costs)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Receita / mês</dt>
          <dd className="font-semibold tabular-nums">{money(income)}</dd>
        </div>
      </dl>
      {team.lateMonths > 0 && <p className="mt-2 rounded-sm bg-loss/15 px-2 py-1 text-xs text-loss">Salários atrasados há {team.lateMonths} mês(es).</p>}
      <button className={`${actionBtn} mt-auto bg-white/10 hover:bg-white/15`} onClick={() => go('carreira')}>
        Patrocínios e finanças
      </button>
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
  // Séries do seu time por dia (rival e resultado).
  const played = new Map<string, { rival: string; won: boolean }>();
  for (const s of w.seriesLog)
    if (s.winner === me || s.loser === me) played.set(s.date, { rival: s.winner === me ? s.loser : s.winner, won: s.winner === me });
  const next = myMatchToday(w);
  if (next) played.set(addDays(w.date, 1), { rival: next.teamAId === me ? next.teamBId : next.teamAId, won: false });
  const mine = w.calendar.filter((e) => involves(e, me));
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <Card
      title="Calendário"
      action={
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
          <button className="px-1 text-muted hover:text-ink" aria-label="Mês anterior" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          {MONTHS[m]} {y}
          <button className="px-1 text-muted hover:text-ink" aria-label="Próximo mês" onClick={() => setOffset(offset + 1)}>
            ›
          </button>
        </span>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1 font-semibold text-muted">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const date = iso(d);
          const game = played.get(date);
          const inEvent = mine.some((e) => e.startDate <= date && date <= e.endDate);
          const today = date === w.date;
          const tone = !game ? '' : date > w.date ? 'ring-1 ring-ink' : game.won ? 'ring-1 ring-win' : 'ring-1 ring-loss';
          return (
            <button
              key={i}
              onClick={() => go('partidas')}
              title={game ? `${game.won ? 'Vitória' : date > w.date ? 'Jogo' : 'Derrota'} × ${w.teams[game.rival]?.name ?? game.rival}` : undefined}
              className={`relative grid aspect-square place-items-center rounded-sm text-[12px] transition hover:bg-white/10 ${inEvent && !game ? 'bg-white/5' : ''} ${today ? 'bg-accent/20 font-bold text-accent' : ''} ${tone}`}
            >
              {game && w.teams[game.rival] ? <TeamBadge team={w.teams[game.rival]} size={20} /> : d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] font-semibold tracking-wider text-muted uppercase">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-ink" />
          Partida
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-win" />
          Vitória
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-loss" />
          Derrota
        </span>
      </div>
    </Card>
  );
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n));

function Tweets({ go }: { go: (l: HomeLink) => void }) {
  const w = useWorld();
  const feed = (w.feed ?? []).slice(0, 4);
  return (
    <Card title="Tweets" action={<button className={linkBtn} onClick={() => go('midia')}>Ver mídia ›</button>}>
      {feed.length ? (
        <ul className="divide-y divide-white/10">
          {feed.map((t) => {
            const h = hashString(t.id);
            const handle = t.author.handle.startsWith('@') ? t.author.handle : `@${t.author.handle}`;
            return (
              <li key={t.id} className="flex gap-3 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold" style={{ background: `hsl(${h % 360} 35% 30%)` }}>
                  {t.author.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 text-[13px]">
                    <span className="font-semibold">{t.author.name}</span>
                    <span className="truncate text-[11px] text-muted">
                      {handle} · {t.date === w.date ? 'hoje' : formatDate(t.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug">{t.text}</p>
                  <div className="mt-1 flex gap-4 text-[11px] text-muted tabular-nums">
                    <span>💬 {compact(Math.round(t.likes * (0.05 + (h % 7) / 100)))}</span>
                    <span>⟲ {compact(Math.round(t.likes * (0.1 + (h % 9) / 100)))}</span>
                    <span>♡ {compact(t.likes)}</span>
                  </div>
                </div>
              </li>
            );
          })}
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
  const live = w.calendar.find((e) => e.status === 'em_andamento' && e.tournament?.participants.includes(me));
  const [view, setView] = useState<'ranking' | 'evento'>(live ? 'evento' : 'ranking');
  const ranked = useMemo(() => Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank), [w.teams]);
  const showEvent = view === 'evento' && live;
  // Tabela do evento: vitórias e derrotas em séries desde o início dele.
  const rows = showEvent
    ? live!.tournament!.participants
        .map((id) => {
          let v = 0;
          let d = 0;
          for (const s of w.seriesLog)
            if (s.date >= live!.startDate) {
              if (s.winner === id) v++;
              else if (s.loser === id) d++;
            }
          return { team: w.teams[id], v, d, out: !!live!.tournament!.placements[id] && live!.tournament!.placements[id] !== 'Campeão' };
        })
        .sort((a, b) => b.v - a.v || a.d - b.d || a.team.hltvRank - b.team.hltvRank)
    : null;
  // 10 linhas do evento, sempre com o seu time (no lugar da 10ª se estiver mais abaixo).
  const eventRows = rows ? rows.slice(0, 10) : null;
  if (rows && eventRows && !eventRows.some((r) => r.team.id === me)) eventRows[9] = rows.find((r) => r.team.id === me)!;
  const myRank = w.teams[me].hltvRank;
  const list = myRank <= 8 ? ranked.slice(0, 8) : [...ranked.slice(0, 4), ...ranked.slice(myRank - 3, myRank + 1)];
  return (
    <Card
      title="Tabela"
      action={
        <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase">
          <button className={`rounded-sm px-2 py-0.5 ${view === 'ranking' ? 'bg-white/10 text-ink' : 'text-muted'}`} onClick={() => setView('ranking')}>
            Ranking
          </button>
          <button disabled={!live} className={`rounded-sm px-2 py-0.5 disabled:opacity-40 ${view === 'evento' ? 'bg-white/10 text-ink' : 'text-muted'}`} onClick={() => setView('evento')}>
            Seu evento
          </button>
        </span>
      }
    >
      <div className="mb-1 flex text-[10px] font-semibold tracking-wider text-muted uppercase">
        <span className="w-7">#</span>
        <span className="flex-1">{showEvent ? live!.name : 'Time'}</span>
        {showEvent ? (
          <>
            <span className="w-7 text-right">V</span>
            <span className="w-7 text-right">D</span>
          </>
        ) : (
          <span className="w-12 text-right">Pts</span>
        )}
      </div>
      <ol className="text-[13px]">
        {(eventRows ?? list.map((team) => ({ team, v: 0, d: 0, out: false }))).map((r) => (
          <li
            key={r.team.id}
            className={`flex items-center gap-2 border-t border-white/5 px-1 py-1.5 ${r.team.id === me ? 'bg-white/10 font-semibold' : ''} ${r.out ? 'opacity-45' : ''}`}
          >
            <span className="w-5 text-muted tabular-nums">{showEvent ? rows!.indexOf(r) + 1 : r.team.hltvRank}</span>
            <TeamBadge team={r.team} size={18} />
            <span className="min-w-0 flex-1 truncate font-semibold tracking-wide uppercase">{r.team.name}</span>
            {showEvent ? (
              <>
                <span className="w-7 text-right tabular-nums">{r.v}</span>
                <span className="w-7 text-right tabular-nums">{r.d}</span>
              </>
            ) : (
              <span className="w-12 text-right text-muted tabular-nums">{r.team.hltvPoints}</span>
            )}
          </li>
        ))}
      </ol>
      <button className={`${linkBtn} mt-auto pt-3 text-left`} onClick={() => go('ranking')}>
        Ranking completo ›
      </button>
    </Card>
  );
}

export function Home({ onPlay, go }: { onPlay: () => void; go: (l: HomeLink) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 [&>*]:flex">
      <div className="lg:col-span-4">
        <NextMatch onPlay={onPlay} go={go} />
      </div>
      <div className="lg:col-span-5">
        <YourTeam go={go} />
      </div>
      <div className="lg:col-span-3">
        <Cash go={go} />
      </div>
      <div className="lg:col-span-3">
        <MonthCalendar go={go} />
      </div>
      <div className="lg:col-span-4">
        <Tweets go={go} />
      </div>
      <div className="lg:col-span-5">
        <Table go={go} />
      </div>
    </div>
  );
}
