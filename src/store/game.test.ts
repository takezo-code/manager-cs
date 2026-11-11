import { describe, expect, it } from 'vitest';
import { savedStateChanged, useGame } from './game';

describe('Autosave', () => {
  it('detecta mudança em qualquer campo salvo, inclusive propostas de patrocínio, caixa de entrada e extrato', () => {
    const s = useGame.getState();
    expect(savedStateChanged({ ...s, sponsorOffers: [] }, s)).toBe(true);
    expect(savedStateChanged({ ...s, inbox: [] }, s)).toBe(true);
    expect(savedStateChanged({ ...s, ledger: [] }, s)).toBe(true);
    expect(savedStateChanged({ ...s }, s)).toBe(false);
    // Campos de tela não contam.
    expect(savedStateChanged({ ...s, message: { kind: 'ok', text: 'x' } }, s)).toBe(false);
  });
});

describe('Autosave (passo 9)', () => {
  it('detecta mudanças no calendário e nos resultados', () => {
    const s = useGame.getState();
    expect(savedStateChanged({ ...s, calendar: [] }, s)).toBe(true);
    expect(savedStateChanged({ ...s, results: [] }, s)).toBe(true);
  });

  it('não existe mais o campeonato único do seletor antigo', () => {
    expect('tournament' in useGame.getState()).toBe(false);
  });
});

describe('Resultados guardados', () => {
  it('guarda só os últimos jogos do seu time', async () => {
    const { trimMyResults } = await import('./game');
    const fake = (i: number) => [`s${i}`, { teamAId: 'furia', teamBId: 'x', seed: i }] as const;
    const many = Object.fromEntries(Array.from({ length: 100 }, (_, i) => fake(i)));
    const kept = trimMyResults(many as never, 'furia', 40);
    expect(Object.keys(kept)).toHaveLength(40);
    expect(kept.s99).toBeTruthy();
    expect(kept.s0).toBeUndefined();
  });
});
