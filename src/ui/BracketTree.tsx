// Chave de mata-mata no formato da Liquipedia: colunas por fase, cartões com horário/dia e BO,
// times com escudo (TBD quando ainda não definidos) e linhas saindo do meio de cada cartão para a próxima fase.
import { addDays } from '../engine/date';
import type { BracketSlot, BracketStage, SlotSource } from '../engine/tournament/types';
import type { Team } from '../engine/types';
import { TeamBadge } from './TeamBadge';

const THIRD = 'Disputa de 3º lugar';
const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIMES = ['13:00', '16:30', '20:00', '22:30'];

/** Cores do painel (azul-acinzentado, como na Liquipedia). */
const C = {
  panel: '#2b343e',
  card: '#222a32',
  cardHead: '#1c232a',
  line: '#56636f',
  border: '#3a4652',
};

const CARD_W = 'w-52';

function TeamRow({ team, score, win, lost, mine }: { team: Team | null; score?: number; win: boolean; lost: boolean; mine: boolean }) {
  return (
    <div className={`flex h-8 items-center gap-2 px-2.5 ${mine ? 'bg-accent/10' : ''}`}>
      {team ? (
        <span className={lost ? 'opacity-50' : ''}>
          <TeamBadge team={team} size={18} />
        </span>
      ) : (
        <span className="grid h-[18px] w-[18px] place-items-center text-[13px] font-bold text-white/25">?</span>
      )}
      <span className={`min-w-0 flex-1 truncate text-[13px] ${!team ? 'text-white/35' : win ? 'font-bold text-white' : lost ? 'text-white/55' : 'text-white/90'}`}>
        {team?.name ?? 'TBD'}
      </span>
      {score !== undefined && <span className={`w-4 text-right text-[13px] font-bold tabular-nums ${win ? 'text-white' : 'text-white/45'}`}>{score}</span>}
    </div>
  );
}

function MatchCard({
  slot,
  when,
  teams,
  myTeamId,
  open,
  can,
}: {
  slot: BracketSlot;
  when: { time: string; day: string };
  teams: Record<string, Team>;
  myTeamId: string;
  open: (id: string) => void;
  can: (id: string) => boolean;
}) {
  const s = slot.series;
  const pick = (src: SlotSource, id?: string): Team | null => (id ? teams[id] : 'team' in src ? teams[src.team] : null) ?? null;
  const ta = pick(slot.a, s?.teamAId);
  const tb = pick(slot.b, s?.teamBId);
  const done = !!s?.winnerId;
  const clickable = !!s && can(s.id);
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => s && open(s.id)}
      className={`${CARD_W} overflow-hidden rounded-[3px] text-left shadow-sm transition ${clickable ? 'hover:brightness-125' : ''}`}
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px]" style={{ background: C.cardHead }}>
        <span className="font-bold text-white/90">{when.time}</span>
        <span className="text-white/60">{when.day}</span>
        <span className="ml-auto font-semibold text-white/60">{(s?.format ?? slot.format).replace('MD', 'BO')}</span>
      </div>
      <TeamRow team={ta} score={done ? s!.score?.[0] : undefined} win={done && s!.winnerId === ta?.id} lost={done && s!.winnerId !== ta?.id} mine={!!ta && ta.id === myTeamId} />
      <div className="h-px" style={{ background: C.border }} />
      <TeamRow team={tb} score={done ? s!.score?.[1] : undefined} win={done && s!.winnerId === tb?.id} lost={done && s!.winnerId !== tb?.id} mine={!!tb && tb.id === myTeamId} />
    </button>
  );
}

const Hline = ({ w = 'w-6' }: { w?: string }) => <span aria-hidden className={`h-px ${w} shrink-0`} style={{ background: C.line }} />;

export function BracketTree(props: {
  b: BracketStage;
  teams: Record<string, Team>;
  myTeamId: string;
  open: (id: string) => void;
  can: (id: string) => boolean;
  /** Data do 1º dia do evento e o dia atual do torneio (para horário/dia de cada jogo). */
  startDate?: string;
  today?: number;
}) {
  const { b, startDate, today = 1 } = props;
  const main = b.slots.filter((s) => s.label !== THIRD);
  const third = b.slots.find((s) => s.label === THIRD);
  const columns = [...new Set(main.map((s) => s.label))].map((label) => main.filter((s) => s.label === label));

  // Dia de cada fase: o dia em que foi jogada; senão, um dia depois da fase anterior.
  const colDay: number[] = [];
  columns.forEach((col, ci) => {
    const played = col.map((s) => s.series?.day).find((d) => d !== undefined);
    colDay[ci] = played ?? Math.max(today + (ci === 0 ? 0 : 1), (colDay[ci - 1] ?? today) + 1);
  });
  const whenOf = (ci: number, si: number) => {
    const date = startDate ? addDays(startDate, colDay[ci] - 1) : null;
    const day = date ? WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] : `Dia ${colDay[ci]}`;
    return { time: TIMES[si % TIMES.length], day };
  };

  return (
    <div className="overflow-x-auto rounded-[3px]" style={{ background: C.panel }}>
      <h3 className="px-4 pt-3 pb-1 text-lg font-bold text-white/95">Chave eliminatória</h3>
      <div className="flex min-w-max px-4 pb-4">
        {columns.map((col, ci) => {
          const last = ci === columns.length - 1;
          const pairs: BracketSlot[][] = [];
          for (let k = 0; k < col.length; k += 2) pairs.push(col.slice(k, k + 2));
          return (
            <div key={col[0].label} className="flex flex-col">
              <h4 className="mb-2 py-2 text-center text-[13px] font-bold text-white/80">{col[0].label}</h4>
              <div className="flex flex-1 flex-col justify-around">
                {pairs.map((pair, pi) => (
                  <div key={pi} className="relative flex flex-1 flex-col justify-around gap-6 py-3">
                    {pair.map((slot, k) => (
                      <div key={slot.id} className="flex items-center">
                        {ci === 0 ? <span className="w-5 shrink-0 text-center text-[11px] text-white/30">→</span> : <Hline />}
                        <MatchCard slot={slot} when={whenOf(ci, pi * 2 + k)} {...props} />
                        {!last && <Hline />}
                      </div>
                    ))}
                    {!last && pair.length === 2 && (
                      <>
                        {/* Junta o par (do meio do 1º cartão ao meio do 2º) e segue para a próxima fase. */}
                        <span aria-hidden className="absolute top-1/4 right-0 bottom-1/4 w-px" style={{ background: C.line }} />
                        <span aria-hidden className="absolute top-1/2 -right-6 h-px w-6" style={{ background: C.line }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {third && (
          <div className="ml-10 flex flex-col justify-end">
            <h4 className="mb-2 py-2 text-center text-[13px] font-bold text-white/80">Disputa de 3º lugar</h4>
            <div className="pb-3">
              <MatchCard slot={third} when={whenOf(columns.length - 1, 1)} {...props} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
