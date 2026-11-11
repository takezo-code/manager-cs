import { useState } from 'react';
import { EVOLUTION_BONUS_PER_LEVEL, EVOLUTION_NAMES, PHASE_LABELS, SKILLS } from '../engine/config';
import { canUseSkill, effectiveAttributes, phaseModifiers, playerOvr, skillPrice, upgradePrice } from '../engine/player';
import { ATTR_KEYS, type Player, type SkillId } from '../engine/types';
import { useGame } from '../store/game';
import { ContractSection } from './ContractSection';
import { MoodSection } from './MoodSection';
import { ATTR_LABEL, ROLE_LABEL, money } from './format';

export function PlayerPanel({ player }: { player: Player }) {
  const upgrade = useGame((s) => s.upgrade);
  const buy = useGame((s) => s.buySkill);
  const teamMoney = useGame((s) => (s.myTeamId ? s.teams[s.myTeamId].money : 0));
  const [skillChoice, setSkillChoice] = useState<SkillId | ''>('');

  const attrs = effectiveAttributes(player);
  const phase = phaseModifiers(player);
  const evo = player.evolution * EVOLUTION_BONUS_PER_LEVEL;
  const skill = player.skillId ? SKILLS[player.skillId] : null;
  const upPrice = upgradePrice(player);
  const available = (Object.keys(SKILLS) as SkillId[]).filter((id) => canUseSkill(player.role, id) && id !== player.skillId);

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold">{player.nick}</h2>
          <p className="text-sm text-muted">
            {ROLE_LABEL[player.role]} · {player.age} anos · {player.country}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl font-bold">{playerOvr(player)}</div>
          <div className="text-xs text-muted">OVR</div>
        </div>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-1 font-medium">Atributo</th>
            <th className="pb-1 text-right font-medium">Base</th>
            <th className="pb-1 text-right font-medium">Evo</th>
            <th className="pb-1 text-right font-medium">Hab.</th>
            <th className="pb-1 text-right font-medium">Fase</th>
            <th className="pb-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {ATTR_KEYS.map((k) => {
            const sk = skill?.attrBonus?.attr === k ? skill.attrBonus.value : 0;
            const ph = phase[k] ?? 0;
            return (
              <tr key={k} className="border-t border-line/60">
                <td className="py-1.5">
                  <span className="mr-2 font-semibold">{k}</span>
                  <span className="text-muted">{ATTR_LABEL[k]}</span>
                </td>
                <td className="text-right tabular-nums">{player.baseAttributes[k]}</td>
                <td className="text-right text-muted tabular-nums">{evo ? `+${evo}` : '–'}</td>
                <td className="text-right text-muted tabular-nums">{sk ? `+${sk}` : '–'}</td>
                <td className={`text-right tabular-nums ${ph > 0 ? 'text-win' : ph < 0 ? 'text-loss' : 'text-muted'}`}>
                  {ph ? (ph > 0 ? `+${ph}` : ph) : '–'}
                </td>
                <td className="font-display text-right text-lg font-bold tabular-nums">{attrs[k]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-muted">
        Fase: {PHASE_LABELS[player.phase]} · Energia {player.energy} · Satisfação {player.satisfaction}
      </p>

      <MoodSection player={player} />
      <ContractSection player={player} />

      <section className="mt-5 border-t border-line pt-4">
        <h3 className="font-display text-lg font-bold">Upgrade de carta</h3>
        <p className="text-sm text-muted">
          Atual: {EVOLUTION_NAMES[player.evolution]}. Cada evolução dá +{EVOLUTION_BONUS_PER_LEVEL} em todos os atributos.
        </p>
        <button
          type="button"
          disabled={upPrice === null || upPrice > teamMoney}
          onClick={() => upgrade(player.id)}
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {upPrice === null
            ? 'Carta Prime'
            : `Evoluir para ${EVOLUTION_NAMES[(player.evolution + 1) as 1 | 2 | 3]} · ${money(upPrice)}`}
        </button>
      </section>

      <section className="mt-5 border-t border-line pt-4">
        <h3 className="font-display text-lg font-bold">Habilidade</h3>
        <p className="text-sm text-muted">
          {skill ? (
            <>
              <span className="font-semibold text-accent">{skill.name}</span>: {skill.description}
            </>
          ) : (
            'Sem habilidade.'
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={skillChoice}
            onChange={(e) => setSkillChoice(e.target.value as SkillId | '')}
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
          >
            <option value="">Escolher habilidade…</option>
            {available.map((id) => (
              <option key={id} value={id}>
                {SKILLS[id].name} ({SKILLS[id].type}) · {money(skillPrice(player, id))}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!skillChoice || skillPrice(player, skillChoice) > teamMoney}
            onClick={() => {
              if (skillChoice) buy(player.id, skillChoice);
              setSkillChoice('');
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {player.skillId ? 'Trocar' : 'Comprar'}
          </button>
        </div>
        {skillChoice && <p className="mt-1.5 text-xs text-muted">{SKILLS[skillChoice].description}</p>}
      </section>
    </div>
  );
}
