import { MAP_NAMES, TRAINING } from '../engine/config';
import { MAP_IDS, type TrainingPlan } from '../engine/types';
import { useGame } from '../store/game';

const MODES: Array<{ id: TrainingPlan['mode']; label: string; hint: string }> = [
  { id: 'treino', label: 'Treinar', hint: `Ganha atributo no foco, mas gasta ${-TRAINING.trainEnergy} de energia por dia.` },
  { id: 'dividido', label: 'Dividir', hint: 'Metade treino, metade descanso: a energia fica estável.' },
  { id: 'descanso', label: 'Descansar', hint: `Recupera ${TRAINING.restEnergy} de energia por dia e melhora um pouco a satisfação.` },
];

/** Plano do time para os dias sem evento. */
export function TrainingSection() {
  const team = useGame((s) => s.teams[s.myTeamId!]);
  const setTraining = useGame((s) => s.setTraining);
  const plan = team.training;
  const mode = MODES.find((m) => m.id === plan.mode)!;
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="font-display text-lg font-bold">Dias livres</h2>
      <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Plano dos dias livres">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={plan.mode === m.id}
            onClick={() => setTraining({ ...plan, mode: m.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${plan.mode === m.id ? 'bg-accent text-black' : 'border border-line text-muted hover:text-ink'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{mode.hint}</p>
      {plan.mode !== 'descanso' && (
        <label className="mt-3 block text-xs text-muted">
          Foco do treino
          <select
            className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink"
            value={plan.focus}
            onChange={(e) => setTraining({ ...plan, focus: e.target.value as TrainingPlan['focus'] })}
          >
            <option value="mira">Mira</option>
            <option value="utilidade">Utilidade</option>
            <option value="taticas">Táticas (Noção de jogo e Equipe)</option>
            {MAP_IDS.map((m) => (
              <option key={m} value={m}>
                Mapa: {MAP_NAMES[m]}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-2 text-xs text-muted">Jovens aprendem mais rápido; cada atributo ganha no máximo +{TRAINING.maxGain} com treino.</p>
    </section>
  );
}
