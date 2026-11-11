import { describe, expect, it } from 'vitest';
import { baseOvr } from '../engine/form';
import { salaryForOvr } from '../engine/market/value';
import { INITIAL_PLAYERS, INITIAL_TEAMS } from './index';

describe('Dados gerados (scripts/gerar-dados.mjs) batem com o motor', () => {
  it('salário inicial de cada jogador fica na faixa de ±15% da referência do motor', () => {
    for (const p of INITIAL_PLAYERS.filter((x) => x.contract)) {
      const ref = salaryForOvr(baseOvr(p));
      const ratio = p.contract!.salary / ref;
      expect(ratio, `${p.nick}: ${p.contract!.salary} vs ${ref}`).toBeGreaterThan(0.8);
      expect(ratio, `${p.nick}: ${p.contract!.salary} vs ${ref}`).toBeLessThan(1.2);
    }
  });

  it('todo jogador de time está no elenco do time e vice-versa', () => {
    for (const t of INITIAL_TEAMS) for (const id of t.playerIds) expect(INITIAL_PLAYERS.find((p) => p.id === id)?.teamId).toBe(t.id);
  });
});
