import { describe, expect, it } from 'vitest';
import { createWorld } from '../season';
import type { TransferEntry, World } from '../world';
import { trackHistory } from './history';

const deal = (w: World, e: Partial<TransferEntry>): TransferEntry => ({ date: w.date, kind: 'transferencia', playerId: 'fallen', fromTeamId: 'mouz', toTeamId: 'furia', fee: 100_000, ...e });

describe('Histórico do manager', () => {
  it('melhor posição no ranking só melhora', () => {
    let w = createWorld('furia');
    w = trackHistory({ ...w, teams: { ...w.teams, furia: { ...w.teams.furia, hltvRank: 4 } } });
    expect(w.manager.bestRank).toBe(4);
    w = trackHistory({ ...w, teams: { ...w.teams, furia: { ...w.teams.furia, hltvRank: 9 } } });
    expect(w.manager.bestRank).toBe(4);
    w = trackHistory({ ...w, teams: { ...w.teams, furia: { ...w.teams.furia, hltvRank: 1 } } });
    expect(w.manager.bestRank).toBe(1);
  });

  it('guarda as 3 maiores compras e as 3 maiores vendas do dia a dia', () => {
    let w = createWorld('furia');
    const fees = [300_000, 900_000, 100_000, 500_000];
    w = { ...w, transferLog: fees.map((fee, i) => deal(w, { fee, playerId: w.teams.mouz.playerIds[i] })) };
    w = trackHistory(w);
    expect(w.manager.buys.map((d) => d.fee)).toEqual([900_000, 500_000, 300_000]);
    w = { ...w, transferLog: [deal(w, { fromTeamId: 'furia', toTeamId: 'g2', fee: 700_000, kind: 'multa' })] };
    w = trackHistory(w);
    expect(w.manager.sales.map((d) => d.fee)).toEqual([700_000]);
    // Negócio de outros times não entra; transferência livre (fee 0) também não.
    w = trackHistory({ ...w, transferLog: [deal(w, { toTeamId: 'g2', fromTeamId: 'mouz', fee: 2_000_000 }), deal(w, { kind: 'livre', fee: 0 })] });
    expect(w.manager.buys).toHaveLength(3);
    expect(w.manager.buys[0].fee).toBe(900_000);
  });

  it('desempregado: nada muda', () => {
    const w = { ...createWorld('furia'), managerTeamId: '' };
    expect(trackHistory(w)).toBe(w);
  });
});
