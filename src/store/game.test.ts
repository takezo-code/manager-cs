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
