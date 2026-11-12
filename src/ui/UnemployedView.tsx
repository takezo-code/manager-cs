import { useState } from 'react';
import { formatDate } from '../engine/date';
import { flushSave } from '../store/autosave';
import { useGame, useWorld } from '../store/game';
import { CalendarPanel } from './CalendarPanel';
import { ManagerOfferItem } from './ManagerOffer';
import { ManagerPanel } from './ManagerPanel';
import { NewsPanel } from './NewsPanel';
import { SocialPanel } from './SocialPanel';
import { RankingPanel } from './RankingPanel';
import { TimeBar } from './TimeBar';

type Tab = 'propostas' | 'perfil' | 'noticias' | 'twitter' | 'calendario' | 'ranking';
const LABEL: Record<Tab, string> = { propostas: 'Propostas', perfil: 'Perfil', noticias: 'Notícias', twitter: 'Twitter', calendario: 'Calendário', ranking: 'Ranking' };

/** Sem time: o tempo passa, o cenário segue e as propostas chegam conforme a reputação. */
export function UnemployedView() {
  const w = useWorld();
  const events = useGame((s) => s.events);
  const toMenu = useGame((s) => s.toMenu);
  const message = useGame((s) => s.message);
  const [tab, setTab] = useState<Tab>('propostas');
  const offers = w.inbox.filter((i) => i.kind === 'manager_proposta');
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-3xl font-bold">{w.manager.name}, sem time</h1>
          <p className="text-sm text-muted">{formatDate(w.date)} · esperando propostas</p>
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
            {t === 'propostas' && offers.length > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-bg">{offers.length}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-4">
        {tab === 'propostas' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              {offers.length ? (
                <ul className="space-y-2">
                  {offers.map((i) => (
                    <ManagerOfferItem key={i.id} item={i} />
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">
                  Nenhuma proposta por enquanto. Avance o tempo: times interessados chamam às segundas, e a sua reputação define quem chama.
                </p>
              )}
            </section>
            <section>
              <h3 className="font-display mb-2 text-xl font-bold">Avisos</h3>
              <ul className="space-y-1 text-sm">
                {events.slice(0, 20).map((e, i) => (
                  <li key={i} className="flex gap-3 border-b border-line/40 pb-1">
                    <span className="w-24 shrink-0 text-muted">{formatDate(e.date)}</span>
                    <span className={e.kind === 'alerta' ? 'text-loss' : e.kind === 'ok' ? 'text-win' : ''}>{e.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : tab === 'perfil' ? (
          <ManagerPanel />
        ) : tab === 'noticias' ? (
          <NewsPanel />
        ) : tab === 'twitter' ? (
          <SocialPanel />
        ) : tab === 'calendario' ? (
          <CalendarPanel />
        ) : (
          <RankingPanel />
        )}
      </div>
    </div>
  );
}
