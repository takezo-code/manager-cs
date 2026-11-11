// Formatos dos eventos reais, como dados: a primeira fase e como montar a seguinte.
import { seededPairs, singleElim, slot, createBracket } from './bracket';
import { createGroup, groupQualified } from './doubleElim';
import { createGsl4, gsl4Qualified } from './gsl4';
import { createSwiss, swissAdvanced } from './swiss';
import type { BracketStage, FormatId, FormatOptions, Group, GroupsStage, SlotSource, Stage, Tournament } from './types';

export type { FormatId, FormatOptions };

interface FormatSpec {
  teams: number;
  first(participants: string[], opts: FormatOptions): Stage;
  /** Próxima fase depois que a atual termina (null = acabou). */
  next(t: Tournament): Stage | null;
}

/** Distribuição em serpentina por grupos (1º no A, 2º no B, …, volta). */
function snake(participants: string[], groups: number): string[][] {
  const out: string[][] = Array.from({ length: groups }, () => []);
  participants.forEach((id, i) => {
    const row = Math.floor(i / groups);
    const col = i % groups;
    out[row % 2 === 0 ? col : groups - 1 - col].push(id);
  });
  return out;
}

const letters = 'ABCD';
const qualified = (g: Group) => (g.kind === 'de8' ? groupQualified(g) : gsl4Qualified(g))!;

/** Playoffs com 6 (os 1º vão direto à semi): QF A2×B3 e B2×A3. */
function sixTeamPlayoff(a: string[], b: string[], thirdPlace: boolean): BracketStage {
  const sf = thirdPlace ? '' : '3º–4º';
  const slots = [
    slot('QF1', 'Quartas de final', { team: a[1] }, { team: b[2] }, '5º–6º'),
    slot('QF2', 'Quartas de final', { team: b[1] }, { team: a[2] }, '5º–6º'),
    slot('SF1', 'Semifinal', { team: a[0] }, { winnerOf: 'QF2' }, sf),
    slot('SF2', 'Semifinal', { team: b[0] }, { winnerOf: 'QF1' }, sf),
  ];
  if (thirdPlace) slots.push(slot('TP', 'Disputa de 3º lugar', { loserOf: 'SF1' }, { loserOf: 'SF2' }, '4º', false, '3º'));
  slots.push(slot('F', 'Grande final', { winnerOf: 'SF1' }, { winnerOf: 'SF2' }, 'Vice', true));
  return createBracket('Playoffs', slots);
}

const groupsStage = (groups: Group[]): GroupsStage => ({ kind: 'groups', name: 'Fase de grupos', groups });

export const FORMATS: Record<FormatId, FormatSpec> = {
  // Major: Stage 1 (17º–32º), Stage 2 (+9º–16º), Stage 3 (+1º–8º, tudo MD3), playoffs com 8.
  major32: {
    teams: 32,
    first: (p) => createSwiss('Stage 1', p.slice(16, 32), false, 25),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      if (cur.kind !== 'swiss') return null;
      const adv = swissAdvanced(cur);
      if (t.stageIdx === 0) return createSwiss('Stage 2', [...t.participants.slice(8, 16), ...adv], false, 17);
      if (t.stageIdx === 1) return createSwiss('Stage 3', [...t.participants.slice(0, 8), ...adv], true, 9);
      return singleElim('Playoffs', seededPairs(adv), !!t.options.thirdPlace);
    },
  },
  // IEM, BLAST Open, CS Asia: 2 grupos de 8 em dupla eliminação (3 passam) + playoffs com 6.
  groups16: {
    teams: 16,
    first: (p, o) => groupsStage(snake(p, 2).map((s, i) => createGroup(`Grupo ${letters[i]}`, s, { openingBo1: o.openingBo1 }))),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      if (cur.kind !== 'groups') return null;
      return sixTeamPlayoff(qualified(cur.groups[0]), qualified(cur.groups[1]), !!t.options.thirdPlace);
    },
  },
  // PGL Bucharest/Astana/Masters: suíço de 16 (MD3) + playoffs com 8.
  swiss16: {
    teams: 16,
    first: (p) => createSwiss('Fase suíça', p, true, 9),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      return cur.kind === 'swiss' ? singleElim('Playoffs', seededPairs(swissAdvanced(cur)), !!t.options.thirdPlace) : null;
    },
  },
  // ESL Pro League (e IEM Kraków, aprox.): Stage 1 (9º–24º), Stage 2 (+1º–8º), ambos MD3, playoffs com 8.
  epl24: {
    teams: 24,
    first: (p) => createSwiss('Stage 1', p.slice(8, 24), true, 17),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      if (cur.kind !== 'swiss') return null;
      const adv = swissAdvanced(cur);
      if (t.stageIdx === 0) return createSwiss('Stage 2', [...t.participants.slice(0, 8), ...adv], true, 9);
      return singleElim('Playoffs', seededPairs(adv), !!t.options.thirdPlace);
    },
  },
  // Esports World Cup: 4 grupos de 8 (4 passam) + playoffs com 16.
  ewc32: {
    teams: 32,
    first: (p) =>
      groupsStage(
        snake(p, 4).map((s, i) =>
          createGroup(`Grupo ${letters[i]}`, s, {
            advance: 4,
            placeLabels: { LR1A: '25º–32º', LR1B: '25º–32º', LR2A: '17º–24º', LR2B: '17º–24º' },
          }),
        ),
      ),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      if (cur.kind !== 'groups') return null;
      const q = cur.groups.map(qualified); // [upper1, upper2, lower1, lower2] por grupo
      const T = (g: number, i: number): SlotSource => ({ team: q[g][i] });
      // Vencedores do upper pegam classificados do lower de outro grupo.
      const pairs: Array<[SlotSource, SlotSource]> = [
        [T(0, 0), T(1, 3)], [T(2, 0), T(3, 3)], [T(1, 0), T(0, 3)], [T(3, 0), T(2, 3)],
        [T(0, 1), T(1, 2)], [T(2, 1), T(3, 2)], [T(1, 1), T(0, 2)], [T(3, 1), T(2, 2)],
      ];
      return singleElim('Playoffs', pairs, !!t.options.thirdPlace);
    },
  },
  // BLAST Rivals: 2 grupos GSL de 4 (3 passam) + playoffs com 6.
  rivals8: {
    teams: 8,
    first: (p) => groupsStage(snake(p, 2).map((s, i) => createGsl4(`Grupo ${letters[i]}`, s, '7º–8º'))),
    next: (t) => {
      const cur = t.stages[t.stageIdx];
      if (cur.kind !== 'groups') return null;
      return sixTeamPlayoff(qualified(cur.groups[0]), qualified(cur.groups[1]), !!t.options.thirdPlace);
    },
  },
  // BLAST Bounty (aprox.): mata-mata de 8.
  bracket8: {
    teams: 8,
    first: (p) => singleElim('Playoffs', seededPairs(p)),
    next: () => null,
  },
};
