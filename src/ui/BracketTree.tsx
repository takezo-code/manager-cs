// Chave de mata-mata no formato da Liquipedia. Cada cartão é posicionado pelos jogos que o alimentam
// (no playoff de 6, o 1º do grupo espera na semi), e as linhas ligam o vencedor à linha certa do próximo jogo.
import { addDays } from '../engine/date';
import type { BracketSlot, BracketStage, SlotSource } from '../engine/tournament/types';
import type { Team } from '../engine/types';
import { TeamBadge } from './TeamBadge';

const THIRD = 'Disputa de 3º lugar';
const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIMES = ['13:00', '16:30', '20:00', '22:30'];
const C = { panel: '#2b343e', card: '#222a32', head: '#1c232a', line: '#5c6874', border: '#3a4652' };

// Medidas do desenho (px).
const W = 200; // largura do cartão
const HEAD = 22; // cabeçalho do cartão
const ROW = 32; // linha de time
const H = HEAD + ROW * 2 + 1;
const GAP_X = 56; // espaço entre colunas (onde passam as linhas)
const GAP_Y = 22;
const LEFT = 26; // margem para as setas de entrada
const TITLE = 34; // títulos das colunas

const rowCenter = (row: 0 | 1) => HEAD + ROW / 2 + row * (ROW + 1);
const winnerOf = (s: SlotSource) => ('winnerOf' in s ? s.winnerOf : null);

function TeamRow({ team, score, win, lost, mine }: { team: Team | null; score?: number; win: boolean; lost: boolean; mine: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-2.5 ${mine ? 'bg-accent/10' : ''}`} style={{ height: ROW }}>
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

export function BracketTree(props: {
  b: BracketStage;
  teams: Record<string, Team>;
  myTeamId: string;
  open: (id: string) => void;
  can: (id: string) => boolean;
  /** Data do 1º dia do evento e o dia do torneio de agora (para horário/dia de cada jogo). */
  startDate?: string;
  today?: number;
}) {
  const { b, teams, myTeamId, open, can, startDate, today = 1 } = props;
  const main = b.slots.filter((s) => s.label !== THIRD);
  const third = b.slots.find((s) => s.label === THIRD);
  const labels = [...new Set(main.map((s) => s.label))];
  const colOf = new Map(main.map((s) => [s.id, labels.indexOf(s.label)]));

  // Posição vertical de cada jogo: a partir de quem o alimenta.
  const top = new Map<string, number>();
  labels.forEach((label, ci) => {
    // Posição desejada pelo(s) jogo(s) que alimenta(m); a coluna é ordenada por ela (linhas sem cruzar).
    const wanted = main
      .filter((x) => x.label === label)
      .map((s, k) => {
        const feeds = ([s.a, s.b] as SlotSource[]).map((src, r) => ({ id: winnerOf(src), r: r as 0 | 1 })).filter((f) => f.id && top.has(f.id));
        const y =
          ci === 0 || !feeds.length
            ? k * (H + GAP_Y)
            : feeds.length === 2
              ? feeds.reduce((sum, f) => sum + top.get(f.id!)! + H / 2, 0) / 2 - H / 2
              : top.get(feeds[0].id!)! + H / 2 - rowCenter(feeds[0].r);
        return { s, y };
      })
      .sort((p, q) => p.y - q.y);
    let floor = 0;
    for (const { s, y } of wanted) {
      const at = Math.max(y, floor);
      top.set(s.id, at);
      floor = at + H + GAP_Y;
    }
  });
  const xOf = (ci: number) => LEFT + ci * (W + GAP_X);
  const lastCol = labels.length - 1;
  const finalTop = [...top.entries()].filter(([id]) => colOf.get(id) === lastCol).map(([, y]) => y)[0] ?? 0;
  const height = Math.max(...[...top.values()].map((y) => y + H));
  const width = xOf(labels.length - 1) + W + 8;

  // Dia de cada fase: o dia em que foi jogada; senão, um depois da anterior.
  const colDay: number[] = [];
  labels.forEach((label, ci) => {
    const played = main.filter((s) => s.label === label).map((s) => s.series?.day).find((d) => d !== undefined);
    colDay[ci] = played ?? Math.max(today, (colDay[ci - 1] ?? today - 1) + 1);
  });
  const when = (ci: number, k: number) => {
    const date = startDate ? addDays(startDate, colDay[ci] - 1) : null;
    return { time: TIMES[k % TIMES.length], day: date ? WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] : `Dia ${colDay[ci]}` };
  };

  const pick = (src: SlotSource, id?: string): Team | null => (id ? teams[id] : 'team' in src ? teams[src.team] : null) ?? null;

  const Card = ({ s, x, y, w }: { s: BracketSlot; x: number; y: number; w: { time: string; day: string } }) => {
    const sr = s.series;
    const ta = pick(s.a, sr?.teamAId);
    const tb = pick(s.b, sr?.teamBId);
    const done = !!sr?.winnerId;
    const clickable = !!sr && can(sr.id);
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => sr && open(sr.id)}
        className={`absolute overflow-hidden rounded-[3px] text-left ${clickable ? 'hover:brightness-125' : ''}`}
        style={{ left: x, top: y + TITLE, width: W, height: H, background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-1.5 px-2.5 text-[11px]" style={{ height: HEAD, background: C.head }}>
          <span className="font-bold text-white/90">{w.time}</span>
          <span className="text-white/60">{w.day}</span>
          <span className="ml-auto font-semibold text-white/60">{(sr?.format ?? s.format).replace('MD', 'BO')}</span>
        </div>
        <TeamRow team={ta} score={done ? sr!.score?.[0] : undefined} win={done && sr!.winnerId === ta?.id} lost={done && sr!.winnerId !== ta?.id} mine={!!ta && ta.id === myTeamId} />
        <div className="h-px" style={{ background: C.border }} />
        <TeamRow team={tb} score={done ? sr!.score?.[1] : undefined} win={done && sr!.winnerId === tb?.id} lost={done && sr!.winnerId !== tb?.id} mine={!!tb && tb.id === myTeamId} />
      </button>
    );
  };

  // Linhas: do meio do cartão que alimenta até a linha (time A ou B) do próximo jogo.
  const lines: string[] = [];
  const arrows: Array<{ x: number; y: number }> = [];
  for (const s of main) {
    const ci = colOf.get(s.id)!;
    const y = top.get(s.id)!;
    ([s.a, s.b] as SlotSource[]).forEach((src, r) => {
      const f = winnerOf(src);
      const ty = TITLE + y + rowCenter(r as 0 | 1);
      if (f && top.has(f)) {
        const fx = xOf(colOf.get(f)!) + W;
        const fy = TITLE + top.get(f)! + H / 2;
        const mx = fx + GAP_X / 2;
        lines.push(`M${fx} ${fy} H${mx} V${ty} H${xOf(ci)}`);
      } else if (!('loserOf' in src)) arrows.push({ x: xOf(ci) - 20, y: ty });
    });
  }

  return (
    <div className="overflow-x-auto rounded-[3px]" style={{ background: C.panel }}>
      <h3 className="px-4 pt-3 text-lg font-bold text-white/95">Chave eliminatória</h3>
      <div className="flex gap-10 px-2 pt-1 pb-4">
        <div className="relative shrink-0" style={{ width, height: height + TITLE }}>
          {labels.map((l, ci) => (
            <h4 key={l} className="absolute text-center text-[13px] font-bold text-white/80" style={{ left: xOf(ci), width: W, top: 8 }}>
              {l}
            </h4>
          ))}
          <svg className="pointer-events-none absolute inset-0" width={width} height={height + TITLE} aria-hidden>
            {lines.map((d, k) => (
              <path key={k} d={d} fill="none" stroke={C.line} strokeWidth={1} />
            ))}
          </svg>
          {arrows.map((a, k) => (
            <span key={k} aria-hidden className="absolute text-[11px] leading-none text-white/35" style={{ left: a.x, top: a.y - 6 }}>
              →
            </span>
          ))}
          {labels.map((l, ci) =>
            main
              .filter((s) => s.label === l)
              .map((s, k) => <Card key={s.id} s={s} x={xOf(ci)} y={top.get(s.id)!} w={when(ci, k)} />),
          )}
        </div>
        {third && (
          <div className="relative shrink-0" style={{ width: W, height: height + TITLE }}>
            <h4 className="absolute w-full text-center text-[13px] font-bold text-white/80" style={{ top: 8 }}>
              Disputa de 3º lugar
            </h4>
            <Card s={third} x={0} y={finalTop} w={when(lastCol, 1)} />
          </div>
        )}
      </div>
    </div>
  );
}
