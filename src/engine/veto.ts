// Veto de mapas no formato usado no cenário competitivo.
// MD1: A ban, B ban, A ban, B ban, A ban, B ban, sobra o decider.
// MD3: A ban, B ban, A pick, B pick, A ban, B ban, sobra o decider.
// MD5: A ban, B ban, A pick, B pick, A pick, B pick, sobra o decider.
import type { Rng } from './rng';
import { readError, vetoNoise, type StaffAttrs } from './staff/effects';
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

/** Ordem do veto do formato (índice 0 = time de melhor seed). O decider vem depois. */
export const vetoSequence = (format: MatchFormat) => SEQUENCE[format];

/** Escolha da IA num passo do veto, sem ruído: bane o mapa de pior vantagem e escolhe o de melhor. */
export function aiVetoChoice(me: Team, opp: Team, action: 'ban' | 'pick', remaining: MapId[]): MapId {
  const edge = (m: MapId) => me.mapStrength[m] - opp.mapStrength[m];
  const sorted = [...remaining].sort((a, b) => (action === 'pick' ? edge(b) - edge(a) : edge(a) - edge(b)));
  return sorted[0];
}

/**
 * Time A (índice 0) é o de melhor seed e começa o veto. Com staff, o técnico (Veto) define o ruído e o
 * analista (Leitura) a precisão com que cada lado lê a força do rival; sem staff, ruído de ±3.
 */
export function runVeto(teams: [Team, Team], format: MatchFormat, rng: Rng, staff?: [StaffAttrs, StaffAttrs]): VetoStep[] {
  const remaining: MapId[] = [...MAP_IDS];
  // Erro de leitura de cada lado sobre cada mapa do rival.
  const misread = staff
    ? staff.map((s) => Object.fromEntries(MAP_IDS.map((m) => [m, (rng.next() - 0.5) * 2 * readError(s.LEI)])) as Record<MapId, number>)
    : null;
  const steps: VetoStep[] = [];
  for (const { team, action } of SEQUENCE[format]) {
    const me = teams[team];
    const opp = teams[1 - team];
    // Vantagem no mapa do ponto de vista de quem escolhe, com um pouco de ruído.
    const noise = staff ? vetoNoise(staff[team].VET) : 3;
    const edge = (m: MapId) => me.mapStrength[m] - (opp.mapStrength[m] + (misread?.[team][m] ?? 0)) + (rng.next() - 0.5) * 2 * noise;
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
