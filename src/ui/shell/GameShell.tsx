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
  const btn = 'font-display rounded-sm px-2 py-1.5 text-[11px] font-bold tracking-wider text-muted uppercase transition hover:bg-white/5 hover:text-ink disabled:opacity-30';
  return (
    <div className="flex items-center gap-1">
      <div className="mr-2 hidden text-right leading-tight sm:block">
        <div className="font-display text-sm font-bold tracking-wide">{formatDate(date)}</div>
        <div className={`text-[10px] tracking-wider uppercase ${open ? 'text-win' : 'text-muted'}`}>{open ? 'Janela aberta' : onVacation(date) ? 'Férias' : 'Mercado fechado'}</div>
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
        className={`font-display rounded-sm px-3 py-1.5 text-[11px] font-bold tracking-wider text-black uppercase transition hover:brightness-110 ${matchDay ? 'bg-win' : 'bg-ink'}`}
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
    <div className="relative min-h-screen">
      {/* Fundo: brilho na cor do time e a sigla gigante, bem apagada. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[48rem] w-[48rem] rounded-full opacity-25 blur-3xl" style={{ background: team.color }} />
        <div className="absolute -bottom-60 -left-40 h-[36rem] w-[36rem] rounded-full bg-ct opacity-10 blur-3xl" />
        <span className="font-display absolute top-24 -right-6 text-[22rem] leading-none font-bold text-white/[0.025] select-none">{team.shortName}</span>
      </div>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0e13]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          <button
            type="button"
            title={`${team.name}: voltar ao menu (o jogo já está salvo)`}
            onClick={async () => {
              await flushSave();
              toMenu();
            }}
            className="shrink-0 rounded-sm p-1 hover:bg-white/5"
          >
            <TeamBadge team={team} size={30} />
          </button>
          <nav className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Seções do jogo">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => onTab(t.id)}
                className={`font-display relative flex h-14 shrink-0 items-center px-3 text-[13px] font-bold tracking-[0.14em] uppercase transition ${tab === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
                {!!t.badge && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] tracking-normal text-black">{t.badge}</span>}
                {tab === t.id && (
                  <>
                    <span className="absolute inset-x-2 bottom-2 h-px bg-ink" />
                    <span className="absolute bottom-[5px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-ink" />
                  </>
                )}
              </button>
            ))}
          </nav>
          <div className="hidden shrink-0 text-right leading-tight 2xl:block">
            <div className="font-display text-sm font-bold text-accent tabular-nums">{money(team.money)}</div>
            <div className="truncate text-[10px] tracking-wider text-muted uppercase">
              {subtitle} · {saveStatus.kind === 'erro' ? 'erro ao salvar' : 'salvo'}
            </div>
          </div>
          <div className="mx-1 hidden h-7 w-px bg-white/10 2xl:block" />
          <TimeControls onAdvance={onAdvance} matchDay={matchDay} />
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
