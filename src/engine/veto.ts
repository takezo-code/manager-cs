// Veto de mapas no formato usado no cenário competitivo.
// MD1: A ban, B ban, A ban, B ban, A ban, B ban, sobra o decider.
// MD3: A ban, B ban, A pick, B pick, A ban, B ban, sobra o decider.
// MD5: A ban, B ban, A pick, B pick, A pick, B pick, sobra o decider.
import type { Rng } from './rng';
import { MAP_IDS, type MapId, type MatchFormat, type Team, type VetoStep } from './types';

const SEQUENCE: Record<MatchFormat, Array<{ team: 0 | 1; action: 'ban' | 'pick' }>> = {
  MD1: [
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
  ],
  MD3: [
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
    { team: 0, action: 'pick' },
    { team: 1, action: 'pick' },
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
  ],
  MD5: [
    { team: 0, action: 'ban' },
    { team: 1, action: 'ban' },
    { team: 0, action: 'pick' },
    { team: 1, action: 'pick' },
    { team: 0, action: 'pick' },
    { team: 1, action: 'pick' },
  ],
};

/** Time A (índice 0) é o de melhor seed e começa o veto. */
export function runVeto(teams: [Team, Team], format: MatchFormat, rng: Rng): VetoStep[] {
  const remaining: MapId[] = [...MAP_IDS];
  const steps: VetoStep[] = [];
  for (const { team, action } of SEQUENCE[format]) {
    const me = teams[team];
    const opp = teams[1 - team];
    // Vantagem no mapa do ponto de vista de quem escolhe, com um pouco de ruído.
    const edge = (m: MapId) => me.mapStrength[m] - opp.mapStrength[m] + (rng.next() - 0.5) * 6;
    const scored = remaining.map((m) => ({ m, e: edge(m) }));
    scored.sort((a, b) => (action === 'pick' ? b.e - a.e : a.e - b.e));
    const map = scored[0].m;
    remaining.splice(remaining.indexOf(map), 1);
    steps.push({ teamId: me.id, action, map });
  }
  steps.push({ teamId: null, action: 'decider', map: remaining[0] });
  return steps;
}

/** Mapas jogados, na ordem. */
export function mapsToPlay(veto: VetoStep[]): VetoStep[] {
  return veto.filter((s) => s.action !== 'ban');
}
