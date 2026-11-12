import { describe, expect, it } from 'vitest';
import { createWorld } from '../season';
import { attrEffect, gainAttr, gainReputation, newManager, reputationBand } from './model';

describe('Manager: perfil e modelo', () => {
  it('manager novo: atributos 30, reputação 10, confiança 60, passagem aberta', () => {
    const m = newManager({ name: 'Thales', age: 30, country: 'BR' }, 'furia', '2026-11-11');
    expect(Object.values(m.attrs)).toEqual([30, 30, 30, 30, 30]);
    expect(m.reputation).toBe(10);
    expect(m.confidence).toBe(60);
    expect(m.stints).toEqual([{ teamId: 'furia', from: '2026-11-11', to: null, reason: null }]);
    expect(m.name).toBe('Thales');
  });

  it('createWorld leva o perfil (padrão: Manager, 35, BR)', () => {
    expect(createWorld('furia').manager.name).toBe('Manager');
    expect(createWorld('furia', 1, { name: 'Ana', age: 40, country: 'PT' }).manager).toMatchObject({ name: 'Ana', age: 40, country: 'PT' });
  });

  it('efeito do atributo: 0 em 30, 1 em 100', () => {
    const m = newManager({ name: 'x', age: 30, country: 'BR' }, 'furia', '2026-11-11');
    expect(attrEffect(m, 'NEG')).toBe(0);
    expect(attrEffect({ ...m, attrs: { ...m.attrs, NEG: 100 } }, 'NEG')).toBe(1);
    expect(attrEffect({ ...m, attrs: { ...m.attrs, NEG: 65 } }, 'NEG')).toBeCloseTo(0.5);
  });

  it('faixas de reputação nos limites', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map(reputationBand)).toEqual([
      'Desconhecido', 'Desconhecido', 'Promissor', 'Promissor', 'Respeitado', 'Respeitado', 'Renomado', 'Renomado', 'Lenda', 'Lenda',
    ]);
  });

  it('atributo e reputação ficam entre os limites', () => {
    const m = newManager({ name: 'x', age: 30, country: 'BR' }, 'furia', '2026-11-11');
    expect(gainAttr({ ...m, attrs: { ...m.attrs, FIN: 99.8 } }, 'FIN', 5).attrs.FIN).toBe(100);
    expect(gainReputation(m, 200).reputation).toBe(100);
    expect(gainReputation(m, -50).reputation).toBe(0);
  });
});
