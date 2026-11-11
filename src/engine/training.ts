// Treino e descanso nos dias em que o time não está em evento.
import { TRAINING } from './config';
import type { AttrKey, Player, TrainingFocus } from './types';
import type { World } from './world';

const FOCUS_ATTRS: Record<'mira' | 'utilidade' | 'taticas', AttrKey[]> = {
  mira: ['MIR'],
  utilidade: ['UTL'],
  taticas: ['NOC', 'EQP'],
};

const isAttrFocus = (f: TrainingFocus): f is keyof typeof FOCUS_ATTRS => f in FOCUS_ATTRS;

const ageMult = (age: number) => (age <= TRAINING.youngAge ? TRAINING.youngMult : age >= TRAINING.oldAge ? TRAINING.oldMult : 1);

/** Aplica um ganho fracionado de treino: o atributo base sobe 1 a cada ponto inteiro acumulado, até o teto. */
function addGain(p: Player, attr: AttrKey, amount: number): Player {
  const before = p.trainingGains?.[attr] ?? 0;
  const after = Math.min(TRAINING.maxGain, before + amount);
  const whole = Math.floor(after) - Math.floor(before);
  return {
    ...p,
    trainingGains: { ...p.trainingGains, [attr]: after },
    baseAttributes: whole > 0 ? { ...p.baseAttributes, [attr]: Math.min(99, p.baseAttributes[attr] + whole) } : p.baseAttributes,
  };
}

/** Um dia livre do time: treino (ganha atributo, gasta energia), descanso (energia e satisfação) ou dividido (metade de cada). */
export function trainDay(w: World, teamId: string): World {
  const team = w.teams[teamId];
  const plan = team.training ?? { mode: 'dividido', focus: 'mira' };
  const train = plan.mode === 'treino' ? 1 : plan.mode === 'dividido' ? 0.5 : 0;
  const rest = 1 - train;
  const players = { ...w.players };
  for (const id of team.playerIds) {
    let p = players[id];
    if (train > 0 && isAttrFocus(plan.focus)) {
      const attrs = FOCUS_ATTRS[plan.focus];
      for (const a of attrs) p = addGain(p, a, (TRAINING.gainPerDay * train * ageMult(p.age)) / attrs.length);
    }
    const energy = Math.max(0, Math.min(100, p.energy + train * TRAINING.trainEnergy + rest * TRAINING.restEnergy));
    const satisfaction = Math.min(100, p.satisfaction + rest * TRAINING.restSatisfaction);
    players[id] = { ...p, energy, satisfaction };
  }
  let teams = w.teams;
  if (train > 0 && !isAttrFocus(plan.focus)) {
    const map = plan.focus;
    const cur = team.mapStrength[map];
    teams = { ...teams, [teamId]: { ...team, mapStrength: { ...team.mapStrength, [map]: Math.min(TRAINING.mapMax, cur + TRAINING.mapGainPerDay * train) } } };
  }
  return { ...w, players, teams };
}
