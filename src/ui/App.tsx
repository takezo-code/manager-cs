import { useEffect, useState } from 'react';
import { flushSave } from '../store/autosave';
import { useGame } from '../store/game';
import { MainMenu } from './MainMenu';
import { MarketPanel } from './MarketPanel';
import { FinancePanel } from './FinancePanel';
import { InboxPanel } from './InboxPanel';
import { formatDate } from '../engine/date';
import { money } from './format';
import { MatchSetup, MatchView } from './MatchView';
import { PlayerCard } from './PlayerCard';
import { PlayerPanel } from './PlayerPanel';
import { TeamBadge } from './TeamBadge';
import { TeamSelect } from './TeamSelect';
import { CalendarPanel } from './CalendarPanel';
import { RankingPanel } from './RankingPanel';
import { TimeBar } from './TimeBar';
import { TrainingSection } from './TrainingSection';
import { AcademyPanel } from './AcademyPanel';
import { StaffPanel } from './StaffPanel';
import { ManagerPanel } from './ManagerPanel';
import { UnemployedView } from './UnemployedView';
import { NewsPanel } from './NewsPanel';
import { SocialPanel } from './SocialPanel';

type Tab = 'elenco' | 'manager' | 'comissao' | 'academy' | 'calendario' | 'ranking' | 'mercado' | 'financas' | 'noticias' | 'social' | 'mensagens' | 'amistoso';

const TAB_LABEL: Record<Tab, string> = {
  elenco: 'Elenco',
  manager: 'Manager',
  comissao: 'Comissão',
  academy: 'Academy',
  calendario: 'Calendário',
  ranking: 'Ranking',
  mercado: 'Mercado',
  financas: 'Finanças',
  noticias: 'Notícias',
  social: 'Social',
  mensagens: 'Mensagens',
  amistoso: 'Amistoso',
};

function SaveIndicator({ slot, status }: { slot: number | null; status: ReturnType<typeof useGame.getState>['saveStatus'] }) {
  const text =
    status.kind === 'saving'
      ? 'Salvando…'
      : status.kind === 'erro'
        ? 'Erro ao salvar'
        : status.kind === 'saved' && status.at
          ? `Salvo às ${new Date(status.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : status.kind === 'saved'
            ? 'Salvo'
            : '';
  return (
    <span className={`text-[11px] ${status.kind === 'erro' ? 'text-loss' : 'text-muted'}`} title={status.error}>
      Slot {slot}
      {text && ` · ${text}`}
    </span>
  );
}

function Dashboard() {
  const myTeamId = useGame((s) => s.myTeamId)!;
  const team = useGame((s) => s.teams[myTeamId]);
  const players = useGame((s) => s.players);
  const lastMatch = useGame((s) => s.lastMatch);
  const message = useGame((s) => s.message);
  const clearMessage = useGame((s) => s.clearMessage);
  const toMenu = useGame((s) => s.toMenu);
  const activeSlot = useGame((s) => s.activeSlot);
  const saveStatus = useGame((s) => s.saveStatus);
  const [tab, setTab] = useState<Tab>('elenco');
  const [selected, setSelected] = useState(team.playerIds[0]);
  const date = useGame((s) => s.date);
  const badges: Partial<Record<Tab, number>> = {
    mensagens: useGame((s) => s.inbox.length),
    financas: useGame((s) => s.sponsorOffers.length),
    mercado: useGame((s) => s.offers.length),
  };
  // Se o jogador selecionado saiu do time, mostra o primeiro titular.
  const current = team.playerIds.includes(selected) ? selected : team.playerIds[0];
  const bench = team.playerIds.filter((id) => !team.starters.includes(id));

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearMessage, 3000);
    return () => clearTimeout(t);
  }, [message, clearMessage]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <TeamBadge team={team} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-3xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted">
            #{team.hltvRank} no ranking HLTV · {team.hltvPoints} pts · {formatDate(date)}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-accent">{money(team.money)}</div>
          <div className="text-xs text-muted">em caixa</div>
        </div>
        <div className="flex flex-col items-end gap-1">
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
          <SaveIndicator slot={activeSlot} status={saveStatus} />
        </div>
      </header>

      <div className="mt-4">
        <TimeBar />
      </div>

      <nav className="mt-4 flex flex-wrap gap-1" role="tablist">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`font-display rounded-lg px-3 py-2 text-lg font-bold transition sm:px-4 ${
              tab === t ? 'bg-panel-2 text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {TAB_LABEL[t]}
            {!!badges[t] && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 align-middle text-xs text-black">{badges[t]}</span>
            )}
          </button>
        ))}
      </nav>

      {message && (
        <div
          role="status"
          className={`mt-3 rounded-lg px-4 py-2 text-sm ${message.kind === 'ok' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'}`}
        >
          {message.text}
        </div>
      )}

      {tab === 'elenco' ? (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {team.playerIds.length < 5 && (
              <p className="rounded-lg bg-loss/15 px-4 py-2 text-sm text-loss">
                Seu elenco tem só {team.playerIds.length} jogadores. Contrate no Mercado para chegar a 5 e poder jogar.
              </p>
            )}
            <TrainingSection />
            <h2 className="text-sm font-semibold text-muted">Titulares</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {team.starters.map((id) => (
                <PlayerCard key={id} player={players[id]} selected={id === current} onClick={() => setSelected(id)} />
              ))}
            </div>
            {bench.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted">Reservas</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {bench.map((id) => (
                    <PlayerCard key={id} player={players[id]} selected={id === current} onClick={() => setSelected(id)} />
                  ))}
                </div>
              </>
            )}
          </div>
          {current && <PlayerPanel player={players[current]} />}
        </div>
      ) : tab === 'mercado' ? (
        <div className="mt-4">
          <MarketPanel />
        </div>
      ) : tab === 'financas' ? (
        <div className="mt-4">
          <FinancePanel />
        </div>
      ) : tab === 'mensagens' ? (
        <div className="mt-4">
          <InboxPanel />
        </div>
      ) : tab === 'calendario' ? (
        <div className="mt-4">
          <CalendarPanel />
        </div>
      ) : tab === 'noticias' ? (
        <div className="mt-4">
          <NewsPanel />
        </div>
      ) : tab === 'social' ? (
        <div className="mt-4">
          <SocialPanel />
        </div>
      ) : tab === 'manager' ? (
        <div className="mt-4">
          <ManagerPanel />
        </div>
      ) : tab === 'comissao' ? (
        <div className="mt-4">
          <StaffPanel />
        </div>
      ) : tab === 'academy' ? (
        <div className="mt-4">
          <AcademyPanel />
        </div>
      ) : tab === 'ranking' ? (
        <div className="mt-4">
          <RankingPanel />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <MatchSetup />
          {lastMatch && <MatchView key={`${lastMatch.seed}-${lastMatch.teamAId}-${lastMatch.teamBId}-${lastMatch.format}`} result={lastMatch} />}
        </div>
      )}
    </div>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const myTeamId = useGame((s) => s.myTeamId);
  if (screen === 'newCareer') return <TeamSelect />;
  if (screen === 'game' && myTeamId) return <Dashboard />;
  if (screen === 'game') return <UnemployedView />;
  return <MainMenu />;
}
