// Chave de mata-mata (estilo Liquipedia/HLTV): colunas por fase, cartões de série e linhas ligando os pares.
import type { BracketSlot, BracketStage, SlotSource } from '../engine/tournament/types';
import type { Team } from '../engine/types';
import { TeamBadge } from './TeamBadge';

const THIRD = 'Disputa de 3º lugar';

function TeamLine({ team, score, win, lost, mine }: { team: Team | null; score?: number; win: boolean; lost: boolean; mine: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 ${lost ? 'opacity-45' : ''} ${mine ? 'bg-accent/10' : ''}`}>
      {team ? <TeamBadge team={team} size={18} /> : <span className="grid h-[18px] w-[18px] place-items-center rounded-sm bg-white/5 text-[10px] text-muted">?</span>}
      <span className={`min-w-0 flex-1 truncate text-[13px] ${team ? (win ? 'font-bold' : 'font-medium') : 'text-muted'}`}>{team?.name ?? 'A definir'}</span>
      <span className={`w-4 text-right text-[13px] tabular-nums ${win ? 'font-bold text-win' : 'text-muted'}`}>{score ?? ''}</span>
    </div>
  );
}

function MatchCard({
  slot,
  teams,
  myTeamId,
  open,
  can,
}: {
  slot: BracketSlot;
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
      className={`w-56 overflow-hidden rounded-sm border bg-panel-2 text-left transition ${clickable ? 'border-white/15 hover:border-accent' : 'border-white/10'} ${ta?.id === myTeamId || tb?.id === myTeamId ? 'ring-1 ring-accent/50' : ''}`}
    >
      <div className="flex justify-between border-b border-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted uppercase">
        <span>{done ? 'Encerrada' : s ? 'Hoje / próxima' : 'A definir'}</span>
        <span>{(s?.format ?? slot.format).replace('MD', 'BO')}</span>
      </div>
      <TeamLine team={ta} score={s?.score?.[0]} win={done && s!.winnerId === ta?.id} lost={done && s!.winnerId !== ta?.id} mine={ta?.id === myTeamId} />
      <div className="h-px bg-white/5" />
      <TeamLine team={tb} score={s?.score?.[1]} win={done && s!.winnerId === tb?.id} lost={done && s!.winnerId !== tb?.id} mine={tb?.id === myTeamId} />
    </button>
  );
}

export function BracketTree(props: { b: BracketStage; teams: Record<string, Team>; myTeamId: string; open: (id: string) => void; can: (id: string) => boolean }) {
  const { b } = props;
  const main = b.slots.filter((s) => s.label !== THIRD);
  const third = b.slots.find((s) => s.label === THIRD);
  const columns = [...new Set(main.map((s) => s.label))].map((label) => main.filter((s) => s.label === label));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-0">
        {columns.map((col, ci) => {
          const last = ci === columns.length - 1;
          // Pares da coluna: cada par alimenta um jogo da próxima.
          const pairs: BracketSlot[][] = [];
          for (let k = 0; k < col.length; k += 2) pairs.push(col.slice(k, k + 2));
          return (
            <div key={col[0].label} className="flex flex-col">
              <h4 className="font-display mb-3 text-center text-[13px] font-bold tracking-wider text-muted">{col[0].label}</h4>
              <div className="flex flex-1 flex-col justify-around">
                {pairs.map((pair, pi) => (
                  <div key={pi} className="relative flex flex-1 flex-col justify-around gap-4 py-2">
                    {pair.map((slot) => (
                      <div key={slot.id} className="relative flex items-center">
                        {ci > 0 && <span aria-hidden className="h-px w-5 bg-white/20" />}
                        <MatchCard slot={slot} {...props} />
                        {!last && <span aria-hidden className="h-px w-5 bg-white/20" />}
                      </div>
                    ))}
                    {/* Linha vertical que junta o par e segue para a próxima fase. */}
                    {!last && pair.length === 2 && (
                      <>
                        <span aria-hidden className="absolute top-1/4 right-0 bottom-1/4 w-px bg-white/20" />
                        <span aria-hidden className="absolute top-1/2 -right-5 h-px w-5 bg-white/20" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {third && (
          <div className="ml-8 flex flex-col justify-end">
            <h4 className="font-display mb-3 text-center text-[13px] font-bold tracking-wider text-muted">3º lugar</h4>
            <MatchCard slot={third} {...props} />
          </div>
        )}
      </div>
    </div>
  );
}
