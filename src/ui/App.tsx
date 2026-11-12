import { useState } from 'react';
import { myMatchToday } from '../engine/schedule';
import { useGame, useWorld, worldOf } from '../store/game';
import { MainMenu } from './MainMenu';
import { MarketPanel } from './MarketPanel';
import { FinancePanel } from './FinancePanel';
import { InboxPanel } from './InboxPanel';
import { MatchSetup, MatchView } from './MatchView';
import { PlayerCard } from './PlayerCard';
import { PlayerPanel } from './PlayerPanel';
import { TeamSelect } from './TeamSelect';
import { CalendarPanel } from './CalendarPanel';
import { RankingPanel } from './RankingPanel';
import { TrainingSection } from './TrainingSection';
import { AcademyPanel } from './AcademyPanel';
import { StaffPanel } from './StaffPanel';
import { ManagerPanel } from './ManagerPanel';
import { UnemployedView } from './UnemployedView';
import { NewsPanel } from './NewsPanel';
import { SocialPanel } from './SocialPanel';
import { GameShell, SubTabs, type NavTab } from './shell/GameShell';
import { Home, type HomeLink } from './home/Home';
import { MatchDay } from './matchday/MatchDay';

type Tab = 'inicio' | 'elenco' | 'partidas' | 'mercado' | 'academy' | 'ranking' | 'carreira' | 'midia' | 'mensagens';
type PartidasTab = 'calendario' | 'amistoso';
type CarreiraTab = 'manager' | 'comissao' | 'financas';
type MidiaTab = 'noticias' | 'social';

function Elenco() {
  const myTeamId = useGame((s) => s.myTeamId)!;
  const team = useGame((s) => s.teams[myTeamId]);
  const players = useGame((s) => s.players);
  const [selected, setSelected] = useState(team.playerIds[0]);
  const current = team.playerIds.includes(selected) ? selected : team.playerIds[0];
  const bench = team.playerIds.filter((id) => !team.starters.includes(id));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {team.playerIds.length < 5 && (
          <p className="rounded-lg bg-loss/15 px-4 py-2 text-sm text-loss">
            Seu elenco tem só {team.playerIds.length} jogadores. Contrate no Mercado para chegar a 5 e poder jogar.
          </p>
        )}
        <TrainingSection />
        <h2 className="font-display text-lg font-bold">Titulares</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {team.starters.map((id) => (
            <PlayerCard key={id} player={players[id]} selected={id === current} onClick={() => setSelected(id)} />
          ))}
        </div>
        {bench.length > 0 && (
          <>
            <h2 className="font-display text-lg font-bold">Reservas</h2>
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
  );
}

function Dashboard() {
  const myTeamId = useGame((s) => s.myTeamId)!;
  const team = useGame((s) => s.teams[myTeamId]);
  const lastMatch = useGame((s) => s.lastMatch);
  const advance = useGame((s) => s.advance);
  const matchDayResult = useGame((s) => s.matchDayResult);
  const inbox = useGame((s) => s.inbox.length);
  const sponsorOffers = useGame((s) => s.sponsorOffers.length);
  const offers = useGame((s) => s.offers.length);
  const world = useWorld();
  const [tab, setTab] = useState<Tab>('inicio');
  const [partidas, setPartidas] = useState<PartidasTab>('calendario');
  const [carreira, setCarreira] = useState<CarreiraTab>('manager');
  const [midia, setMidia] = useState<MidiaTab>('noticias');
  const [matchOpen, setMatchOpen] = useState(false);
  const matchTomorrow = !!myMatchToday(world);

  const onAdvance = (t: number | 'jogo') => {
    // Véspera do jogo do seu time: o avanço abre o dia de jogo (o veto é seu).
    if (myMatchToday(worldOf(useGame.getState()))) return setMatchOpen(true);
    advance(t);
    if (t === 'jogo' && myMatchToday(worldOf(useGame.getState()))) {
      setTab('inicio');
      setMatchOpen(true);
    }
  };
  const go = (l: HomeLink) => setTab(l);

  const tabs: NavTab<Tab>[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'elenco', label: 'Elenco' },
    { id: 'partidas', label: 'Partidas' },
    { id: 'mercado', label: 'Mercado', badge: offers },
    { id: 'academy', label: 'Academy' },
    { id: 'ranking', label: 'Ranking' },
    { id: 'carreira', label: 'Carreira', badge: sponsorOffers },
    { id: 'midia', label: 'Mídia' },
    { id: 'mensagens', label: 'Mensagens', badge: inbox },
  ];

  const showMatch = matchOpen || !!matchDayResult;
  return (
    <GameShell
      team={team}
      subtitle={`#${team.hltvRank} no ranking HLTV`}
      tabs={tabs}
      tab={tab}
      onTab={(t) => {
        setMatchOpen(false);
        setTab(t);
      }}
      onAdvance={onAdvance}
      matchDay={matchTomorrow}
    >
      {showMatch ? (
        <MatchDay onClose={() => setMatchOpen(false)} />
      ) : tab === 'inicio' ? (
        <Home onPlay={() => setMatchOpen(true)} go={go} />
      ) : tab === 'elenco' ? (
        <Elenco />
      ) : tab === 'partidas' ? (
        <>
          <SubTabs<PartidasTab>
            tabs={[
              { id: 'calendario', label: 'Calendário' },
              { id: 'amistoso', label: 'Amistoso' },
            ]}
            value={partidas}
            onChange={setPartidas}
          />
          {partidas === 'calendario' ? (
            <CalendarPanel />
          ) : (
            <div className="space-y-4">
              <MatchSetup />
              {lastMatch && <MatchView key={`${lastMatch.seed}-${lastMatch.teamAId}-${lastMatch.teamBId}-${lastMatch.format}`} result={lastMatch} />}
            </div>
          )}
        </>
      ) : tab === 'mercado' ? (
        <MarketPanel />
      ) : tab === 'academy' ? (
        <AcademyPanel />
      ) : tab === 'ranking' ? (
        <RankingPanel />
      ) : tab === 'carreira' ? (
        <>
          <SubTabs<CarreiraTab>
            tabs={[
              { id: 'manager', label: 'Manager' },
              { id: 'comissao', label: 'Comissão técnica' },
              { id: 'financas', label: 'Finanças', badge: sponsorOffers },
            ]}
            value={carreira}
            onChange={setCarreira}
          />
          {carreira === 'manager' ? <ManagerPanel /> : carreira === 'comissao' ? <StaffPanel /> : <FinancePanel />}
        </>
      ) : tab === 'midia' ? (
        <>
          <SubTabs<MidiaTab>
            tabs={[
              { id: 'noticias', label: 'Notícias' },
              { id: 'social', label: 'Social' },
            ]}
            value={midia}
            onChange={setMidia}
          />
          {midia === 'noticias' ? <NewsPanel /> : <SocialPanel />}
        </>
      ) : (
        <InboxPanel />
      )}
    </GameShell>
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
