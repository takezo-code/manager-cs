import { useEffect, useState } from 'react';
import { formatDate } from '../engine/date';
import { flushSave } from '../store/autosave';
import { useGame, useWorld } from '../store/game';
import { AcademyPanel } from './AcademyPanel';
import { CalendarPanel } from './CalendarPanel';
import { money } from './format';
import { ManagerOfferItem } from './ManagerOffer';
import { ManagerPanel } from './ManagerPanel';
import { NewsPanel } from './NewsPanel';
import { RankingPanel } from './RankingPanel';
import { TeamBadge } from './TeamBadge';
import { Tier2Panel } from './Tier2Panel';
import { TimeBar } from './TimeBar';

type Tab = 'academy' | 'tier2' | 'mensagens' | 'manager' | 'noticias' | 'calendario' | 'ranking';
const LABEL: Record<Tab, string> = {
  academy: 'Academy',
  tier2: 'Tier 2/3',
  mensagens: 'Mensagens',
  manager: 'Manager',
  noticias: 'Notícias',
  calendario: 'Calendário',
  ranking: 'Ranking',
};

/** Carreira na academy: o time principal é da IA; você cuida dos jovens, do tier 2 e dos empréstimos. */
export function AcademyManagerView() {
  const w = useWorld();
  const events = useGame((s) => s.events);
  const toMenu = useGame((s) => s.toMenu);
  const message = useGame((s) => s.message);
  const clearMessage = useGame((s) => s.clearMessage);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearMessage, 3000);
    return () => clearTimeout(t);
  }, [message, clearMessage]);
  const [tab, setTab] = useState<Tab>('academy');
  const org = w.teams[w.manager.academyOf!];
  const offers = w.inbox.filter((i) => i.kind === 'manager_proposta');
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <TeamBadge team={org} size={52} />
        <div className="min-w-[11rem] flex-1">
          <h1 className="font-display truncate text-3xl font-bold">{org.name} Academy</h1>
          <p className="text-sm text-muted">
            {w.manager.name} · {formatDate(w.date)} · o time principal é da diretoria
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-accent">{money(org.money)}</div>
          <div className="text-xs text-muted">caixa da organização</div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await flushSave();
            toMenu();
          }}
          className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-ink"
        >
          Menu
        </button>
      </header>
      <div className="mt-4">
        <TimeBar />
      </div>
      {message && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.kind === 'erro' ? 'bg-loss/15 text-loss' : 'bg-win/15 text-win'}`}>{message.text}</p>}
      <nav className="mt-4 flex flex-wrap gap-1" role="tablist">
        {(Object.keys(LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`font-display rounded-lg px-3 py-2 text-base font-semibold ${tab === t ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {LABEL[t]}
            {t === 'mensagens' && offers.length > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-bg">{offers.length}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-4">
        {tab === 'academy' ? (
          <AcademyPanel />
        ) : tab === 'tier2' ? (
          <Tier2Panel />
        ) : tab === 'mensagens' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="font-display mb-2 text-xl font-bold">Propostas</h3>
              {offers.length ? (
                <ul className="space-y-2">
                  {offers.map((i) => (
                    <ManagerOfferItem key={i.id} item={i} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhuma proposta. Bata as metas da academy para a diretoria te chamar para o time principal.</p>
              )}
            </section>
            <section>
              <h3 className="font-display mb-2 text-xl font-bold">Avisos</h3>
              <ul className="space-y-1 text-sm">
                {events.slice(0, 25).map((e, i) => (
                  <li key={i} className="flex gap-3 border-b border-line/40 pb-1">
                    <span className="w-24 shrink-0 text-muted">{formatDate(e.date)}</span>
                    <span className={e.kind === 'alerta' ? 'text-loss' : e.kind === 'ok' ? 'text-win' : ''}>{e.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : tab === 'manager' ? (
          <ManagerPanel />
        ) : tab === 'noticias' ? (
          <NewsPanel />
        ) : tab === 'calendario' ? (
          <CalendarPanel />
        ) : (
          <RankingPanel />
        )}
      </div>
    </div>
  );
}
