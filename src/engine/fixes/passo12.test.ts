import { describe, expect, it } from 'vitest';
import { managerDealsDay } from '../manager/effects';
import { createWorld } from '../season';

describe('Ajustes do passo 12', () => {
  it('multa paga pela IA por um jogador seu não conta como negociação sua', () => {
    const w = createWorld('furia');
    const base = { date: w.date, playerId: 'x', fee: 900_000 };
    const poached = { ...w, transferLog: [{ ...base, kind: 'multa' as const, fromTeamId: 'furia', toTeamId: 'g2' }] };
    expect(managerDealsDay(poached).manager.attrs.NEG).toBe(30);
    const bought = { ...w, transferLog: [{ ...base, kind: 'multa' as const, fromTeamId: 'g2', toTeamId: 'furia' }] };
    expect(managerDealsDay(bought).manager.attrs.NEG).toBeCloseTo(30.5);
    const sold = { ...w, transferLog: [{ ...base, kind: 'transferencia' as const, fromTeamId: 'furia', toTeamId: 'g2' }] };
    expect(managerDealsDay(sold).manager.attrs.NEG).toBeCloseTo(30.5);
  });
});
