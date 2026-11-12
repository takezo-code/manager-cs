import { CLUB_SIZE_LABEL } from '../engine/manager/board';
import { MANAGER_ATTRS, reputationBand, type ManagerAttr } from '../engine/manager/model';
import { formatDate } from '../engine/date';
import { MANAGER } from '../engine/config';
import { useGame, useWorld } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

export const MANAGER_ATTR_LABEL: Record<ManagerAttr, string> = {
  NEG: 'Negociação',
  FIN: 'Finanças',
  COM: 'Comunicação',
  TAL: 'Olho pra talento',
  VES: 'Gestão de vestiário',
};

const ATTR_HINT: Record<ManagerAttr, string> = {
  NEG: 'Preços melhores nas compras e vendas. Sobe fechando negócios.',
  FIN: 'Patrocínios melhores e salários mais baratos. Sobe com o caixa saudável.',
  COM: 'Posts e torcida (chega no próximo passo).',
  TAL: 'Olheiro mais preciso. Sobe promovendo jovens da academy.',
  VES: 'Satisfação do elenco e menos ciúme. Sobe com o elenco satisfeito.',
};

const BANDS = ['Desconhecido', 'Promissor', 'Respeitado', 'Renomado', 'Lenda'] as const;

/** Escada de reputação: as cinco faixas lado a lado, com o marcador na sua posição. */
function ReputationLadder({ rep }: { rep: number }) {
  const band = reputationBand(rep);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Reputação</h3>
        <span className="text-sm tabular-nums text-muted">{Math.round(rep)} de 100</span>
      </div>
      <div className="relative mt-2 grid grid-cols-5 gap-1" aria-label={`Reputação ${Math.round(rep)}: ${band}`}>
        {BANDS.map((b) => (
          <div key={b} className={`rounded-md px-1 py-2 text-center text-[11px] font-semibold sm:text-xs ${b === band ? 'bg-accent text-bg' : 'bg-black/30 text-muted'}`}>
            {b}
          </div>
        ))}
        <span className="absolute -bottom-2 h-2 w-0.5 bg-accent" style={{ left: `${rep}%` }} aria-hidden />
      </div>
      <p className="mt-4 text-xs text-muted">Sobe com títulos, metas batidas e caixa saudável. Jogadores aceitam vir com mais facilidade e times maiores passam a chamar.</p>
    </div>
  );
}

function Attributes() {
  const m = useGame((s) => s.manager);
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="font-display text-lg font-bold">Atributos</h3>
      <div className="mt-3 space-y-2.5">
        {MANAGER_ATTRS.map((k) => {
          const v = m.attrs[k];
          return (
            <div key={k} title={ATTR_HINT[k]}>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{MANAGER_ATTR_LABEL[k]}</span>
                <span className="font-semibold tabular-nums">{v.toFixed(1).replace('.', ',')}</span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-black/40">
                <span className="absolute inset-y-0 left-0 rounded-full bg-accent/70" style={{ width: `${v}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{ATTR_HINT[k]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Board() {
  const w = useWorld();
  const m = w.manager;
  const resign = useGame((s) => s.resignManager);
  if (!w.managerTeamId) return null;
  const team = w.teams[w.managerTeamId];
  const danger = m.confidence < MANAGER.fireBelow + 15;
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Diretoria da {team.shortName}</h3>
        <span className="text-xs text-muted">clube {CLUB_SIZE_LABEL[m.clubSize]}</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Confiança</span>
          <span className={`font-semibold tabular-nums ${danger ? 'text-loss' : 'text-ink'}`}>{Math.round(m.confidence)}</span>
        </div>
        <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-black/40" aria-label={`Confiança ${Math.round(m.confidence)} de 100; abaixo de ${MANAGER.fireBelow} é demissão`}>
          <span className={`absolute inset-y-0 left-0 rounded-full ${danger ? 'bg-loss' : 'bg-win/80'}`} style={{ width: `${m.confidence}%` }} />
          {/* Zona de demissão por cima da barra, sempre visível. */}
          <span className="absolute inset-y-0 left-0 border-r-2 border-loss bg-loss/35" style={{ width: `${MANAGER.fireBelow}%` }} title="Zona de demissão" />
        </div>
        <p className="mt-1 text-[11px] text-muted">Abaixo de {MANAGER.fireBelow} na avaliação de 31/12, você é demitido.</p>
      </div>
      <h4 className="mt-4 text-sm font-semibold">Metas até 31/12/{m.goalsSeason}</h4>
      <ul className="mt-1 space-y-1 text-sm">
        {m.goals.map((g) => (
          <li key={g.kind} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ◆
            </span>
            {g.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Cada meta batida: +{MANAGER.goalMetConfidence} de confiança e {money(MANAGER.boardInjection[m.clubSize])} no caixa. Cada falha: −
        {MANAGER.goalFailedConfidence[m.clubSize]}.
      </p>
      <p className="mt-3 text-xs text-muted">Seu salário: {money(m.salary)}/mês.</p>
      <button
        type="button"
        className="mt-3 text-xs text-muted underline-offset-2 hover:text-loss hover:underline"
        onClick={() => window.confirm(`Pedir demissão da ${team.name}? Você fica sem time e perde ${-MANAGER.repResigned} de reputação.`) && resign()}
      >
        Pedir demissão
      </button>
    </section>
  );
}

function History() {
  const w = useWorld();
  const m = w.manager;
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="font-display text-lg font-bold">Carreira</h3>
      <ol className="mt-3 space-y-2">
        {[...m.stints].reverse().map((s, i) => {
          const t = w.teams[s.teamId];
          return (
            <li key={`${s.teamId}-${s.from}-${i}`} className="flex items-center gap-3">
              {t && <TeamBadge team={t} size={28} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t?.name ?? s.teamId}</p>
                <p className="text-xs text-muted">
                  {formatDate(s.from)} – {s.to ? formatDate(s.to) : 'hoje'}
                  {s.reason && ` (${s.reason})`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Títulos</dt>
          <dd className="font-display text-2xl font-bold">{m.titles.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Melhor posição no ranking</dt>
          <dd className="font-display text-2xl font-bold">{m.bestRank ? `#${m.bestRank}` : '–'}</dd>
        </div>
      </dl>
      {m.titles.length > 0 && (
        <ul className="mt-2 text-sm">
          {[...m.titles].reverse().map((t) => (
            <li key={`${t.event}-${t.date}`}>
              {t.event} <span className="text-xs text-muted">({w.teams[t.teamId]?.shortName}, {formatDate(t.date)})</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(
          [
            ['Maiores compras', m.buys],
            ['Maiores vendas', m.sales],
          ] as const
        ).map(([title, list]) => (
          <div key={title}>
            <h4 className="text-sm font-semibold">{title}</h4>
            {list.length ? (
              <ul className="mt-1 text-sm">
                {list.map((d) => (
                  <li key={`${d.playerId}-${d.date}`} className="flex justify-between gap-2">
                    <span>{d.nick}</span>
                    <span className="tabular-nums text-muted">{money(d.fee)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted">Nenhuma ainda.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ManagerPanel() {
  const m = useGame((s) => s.manager);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="font-display text-3xl font-bold">{m.name}</h2>
          <span className="text-sm text-muted">
            {m.age} anos, {m.country}
          </span>
        </div>
        <div className="mt-4">
          <ReputationLadder rep={m.reputation} />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Board />
          <Attributes />
        </div>
        <History />
      </div>
    </div>
  );
}
