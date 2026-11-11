import { playerOvr } from '../engine/player';
import { useGame } from '../store/game';
import { money } from './format';
import { TeamBadge } from './TeamBadge';

export function TeamSelect() {
  const teams = useGame((s) => s.teams);
  const players = useGame((s) => s.players);
  const choose = useGame((s) => s.startCareer);
  const toMenu = useGame((s) => s.toMenu);
  const slot = useGame((s) => s.pendingSlot);
  const list = Object.values(teams).sort((a, b) => a.hltvRank - b.hltvRank);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <button type="button" onClick={toMenu} className="mb-6 text-sm text-muted hover:text-ink">
        ‹ Voltar ao menu
      </button>
      <p className="font-display text-sm font-semibold tracking-[0.3em] text-accent uppercase">Nova carreira · Slot {slot}</p>
      <h1 className="font-display mt-1 text-4xl font-bold sm:text-5xl">Escolha seu time</h1>
      <p className="mt-2 max-w-xl text-muted">Top 32 do ranking HLTV de 9 de novembro de 2026. Você assume como manager.</p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const avg = Math.round(t.playerIds.reduce((s, id) => s + playerOvr(players[id]), 0) / t.playerIds.length);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => choose(t.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-accent/60 hover:bg-panel-2"
              >
                <span className="font-display w-8 text-2xl font-bold text-muted">#{t.hltvRank}</span>
                <TeamBadge team={t} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate text-2xl font-bold">{t.name}</div>
                  <div className="text-sm text-muted">
                    {t.hltvPoints} pts · Caixa {money(t.money)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold">{avg}</div>
                  <div className="text-xs text-muted">OVR médio</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
