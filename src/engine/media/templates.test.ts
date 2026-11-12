import { describe, expect, it } from 'vitest';
import { ALL_GROUPS, ALLOWED_VARS, fill, pick, say } from './templates';

const sample: Record<string, string> = {
  jogador: 'fallen',
  time: 'FURIA',
  rival: 'MIBR',
  evento: 'IEM Rio',
  valor: 'US$ 500 mil',
  manager: 'Thales',
};

describe('Templates de mídia', () => {
  it('fill troca todas as variáveis e reclama se sobrar alguma', () => {
    expect(fill('{jogador} na {time}', { jogador: 'fallen', time: 'FURIA' })).toBe('fallen na FURIA');
    expect(() => fill('{jogador} na {time}', { jogador: 'fallen' })).toThrow();
  });

  it('pick é estável pela semente', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(pick(list, 'x:1')).toBe(pick(list, 'x:1'));
    expect(new Set(Array.from({ length: 40 }, (_, i) => pick(list, `s${i}`))).size).toBeGreaterThan(1);
  });

  it('toda situação tem pelo menos 10 frases, e todas preenchem com as variáveis declaradas', () => {
    for (const [groupName, group] of Object.entries(ALL_GROUPS))
      for (const [key, sit] of Object.entries(group)) {
        expect(sit.lines.length, `${groupName}.${key}`).toBeGreaterThanOrEqual(10);
        for (const v of sit.vars) expect(ALLOWED_VARS, `${groupName}.${key}`).toContain(v);
        const vars = Object.fromEntries(sit.vars.map((v) => [v, sample[v]]));
        for (const line of sit.lines) {
          const out = fill(line, vars);
          expect(out, `${groupName}.${key}: ${line}`).not.toMatch(/[{}]/);
        }
      }
  });

  it('say monta a frase da situação', () => {
    const out = say('news', 'transferencia', sample, 'seed');
    expect(out).toContain('fallen');
  });
});
