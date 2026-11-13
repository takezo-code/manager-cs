// Estrutura do jogo: barra do topo (abas, data e avanço do tempo) e a área da aba aberta.
import { useEffect, type ReactNode } from 'react';
import { onVacation, windowOpen } from '../../engine/calendar';
import { formatDate } from '../../engine/date';
import { flushSave } from '../../store/autosave';
import { useGame } from '../../store/game';
import { TeamBadge } from '../TeamBadge';
import { ErrorBoundary } from './ErrorBoundary';
import { money } from '../format';
import type { Team } from '../../engine/types';

export interface NavTab<T extends string> {
  id: T;
  label: string;
  badge?: number;
}

/** Abas internas de uma seção (ex.: Carreira → Manager, Comissão, Finanças). */
export function SubTabs<T extends string>({ tabs, value, onChange }: { tabs: NavTab<T>[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${value === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {t.label}
          {!!t.badge && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] text-black">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** Data, situação do mercado e os botões de avançar. `onAdvance` decide o que fazer (o dia de jogo intercepta). */
function TimeControls({ onAdvance, matchDay }: { onAdvance: (t: number | 'jogo') => void; matchDay: boolean }) {
  const date = useGame((s) => s.date);
  const open = windowOpen(date);
  const btn = 'rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-white/5 hover:text-ink';
  return (
    <div className="flex items-center gap-1">
      <div className="mr-2 hidden text-right leading-tight sm:block">
        <div className="font-display text-base font-bold">{formatDate(date)}</div>
        <div className={`text-[11px] ${open ? 'text-win' : 'text-muted'}`}>{open ? 'Janela aberta' : onVacation(date) ? 'Férias' : 'Mercado fechado'}</div>
      </div>
      <button type="button" className={btn} onClick={() => onAdvance(1)} disabled={matchDay}>
        +1 dia
      </button>
      <button type="button" className={btn} onClick={() => onAdvance(7)} disabled={matchDay}>
        +1 semana
      </button>
      <button
        type="button"
        onClick={() => onAdvance('jogo')}
        className={`rounded-md px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110 ${matchDay ? 'bg-win' : 'bg-accent'}`}
        title={matchDay ? 'Seu time joga amanhã: abrir o dia de jogo' : 'Avança até o próximo jogo do seu time ou até chegar algo novo nas mensagens (no máximo 60 dias).'}
      >
        {matchDay ? 'Dia de jogo' : 'Continuar'}
      </button>
    </div>
  );
}

export function GameShell<T extends string>({
  team,
  subtitle,
  tabs,
  tab,
  onTab,
  onAdvance,
  matchDay,
  children,
}: {
  team: Team;
  subtitle: string;
  tabs: NavTab<T>[];
  tab: T;
  onTab: (t: T) => void;
  onAdvance: (t: number | 'jogo') => void;
  matchDay: boolean;
  children: ReactNode;
}) {
  const toMenu = useGame((s) => s.toMenu);
  const message = useGame((s) => s.message);
  const clearMessage = useGame((s) => s.clearMessage);
  const saveStatus = useGame((s) => s.saveStatus);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearMessage, 3500);
    return () => clearTimeout(t);
  }, [message, clearMessage]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-2">
          <button
            type="button"
            title="Voltar ao menu (o jogo já está salvo)"
            onClick={async () => {
              await flushSave();
              toMenu();
            }}
            className="flex min-w-0 items-center gap-2 rounded-md py-1 pr-2 text-left hover:bg-white/5"
          >
            <TeamBadge team={team} size={32} />
            <span className="hidden min-w-0 leading-tight md:block">
              <span className="font-display block truncate text-base font-bold">{team.name}</span>
              <span className="block truncate text-[11px] text-muted">
                {subtitle} · {saveStatus.kind === 'erro' ? 'erro ao salvar' : 'salvo'}
              </span>
            </span>
          </button>
          <div className="flex-1" />
          <div className="hidden text-right sm:block">
            <div className="font-display text-base font-bold text-accent">{money(team.money)}</div>
            <div className="text-[11px] text-muted">em caixa</div>
          </div>
          <div className="mx-1 hidden h-8 w-px bg-line sm:block" />
          <TimeControls onAdvance={onAdvance} matchDay={matchDay} />
        </div>
        <div className="mx-auto max-w-7xl px-2">
          <nav className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Seções do jogo">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => onTab(t.id)}
                className={`font-display relative shrink-0 px-3 pt-2 pb-2.5 text-[15px] font-bold tracking-wide transition ${tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
                {!!t.badge && <span className="ml-1 rounded-full bg-accent px-1.5 align-middle text-[10px] text-black">{t.badge}</span>}
                {tab === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded bg-accent" />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {message && (
        <div role="status" className={`fixed right-4 bottom-4 z-30 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${message.kind === 'ok' ? 'bg-win text-black' : 'bg-loss text-black'}`}>
          {message.text}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-5">
        <ErrorBoundary resetKey={tab} onBack={() => onTab(tabs[0].id)}>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
