import { PHASE_LABELS, SKILLS } from '../engine/config';
import { effectiveAttributes, playerOvr, playerTier } from '../engine/player';
import { ATTR_KEYS, type Player } from '../engine/types';
import { ROLE_LABEL, TIER_LABEL, cardColor, tierColor } from './format';

export function PlayerCard({ player, selected, onClick }: { player: Player; selected?: boolean; onClick?: () => void }) {
  const ovr = playerOvr(player);
  const tier = playerTier(player);
  const color = cardColor(tier, player.evolution);
  const attrs = effectiveAttributes(player);
  const phaseGood = ['destaque', 'em_alta', 'boa_fase'].includes(player.phase);
  const phaseBad = ['abaixo', 'ma_fase'].includes(player.phase);
  // Carta especial de evento: o MVP ganha moldura dourada e a faixa do evento enquanto vale o bônus.
  const mvp = player.mvpUntil ? [...(player.awards ?? [])].reverse().find((a) => a.kind === 'MVP') : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition ${
        selected ? 'border-white/70 ring-2 ring-white/40' : mvp ? 'mvp-card border-transparent' : 'border-white/10 hover:border-white/40'
      }`}
      style={{
        background: mvp
          ? 'linear-gradient(160deg, #3a2a05 0%, #15110a 45%, #0b0e13 100%)'
          : `linear-gradient(160deg, color-mix(in srgb, ${color} 55%, #0b0e13) 0%, color-mix(in srgb, ${color} 18%, #0b0e13) 55%, #0b0e13 100%)`,
      }}
    >
      {mvp && (
        <div className="mvp-ribbon truncate px-3 py-1 text-[11px] font-bold text-black" title={`MVP de ${mvp.event}`}>
          MVP · {mvp.event}
        </div>
      )}
      <div className="flex items-start justify-between p-3 pb-0">
        <div>
          <div className="font-display text-4xl leading-none font-bold">{ovr}</div>
          <div className="font-display text-sm font-semibold text-white/80">{ROLE_LABEL[player.role]}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase"
            style={{ background: tierColor(tier) }}
          >
            {TIER_LABEL[tier]}
          </span>
          {player.evolution > 0 && (
            <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
              {player.evolution === 3 ? 'PRIME' : `EVO ${player.evolution}`}
            </span>
          )}
          <span className="text-[11px] font-semibold text-white/70">{player.country}</span>
        </div>
      </div>

      <div className="font-display truncate px-3 pt-3 text-2xl font-bold">{player.nick}</div>

      <div className="flex h-6 items-center gap-1.5 px-3">
        {player.phase !== 'normal' && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              phaseGood ? 'bg-win/20 text-win' : phaseBad ? 'bg-loss/20 text-loss' : ''
            }`}
          >
            {PHASE_LABELS[player.phase]}
          </span>
        )}
        {player.skillId && (
          <span className="truncate rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {SKILLS[player.skillId].name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/10 bg-black/30 px-3 py-2.5 sm:grid-cols-3">
        {ATTR_KEYS.map((k) => (
          <div key={k} className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold text-white/55">{k}</span>
            <span className="font-display text-lg font-bold">{attrs[k]}</span>
          </div>
        ))}
      </div>
      <div className="h-1 w-full bg-black/40" title={`Energia ${player.energy}`}>
        <div
          className={`h-full ${player.energy >= 60 ? 'bg-win' : player.energy >= 40 ? 'bg-accent' : 'bg-loss'}`}
          style={{ width: `${player.energy}%` }}
        />
      </div>
    </button>
  );
}
