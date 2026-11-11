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
