import { describe, expect, it } from 'vitest';
import { baseStandings, newBaseSeason, playBaseRound } from './baseLeague';
import { createRng } from './rng';
import { createWorld } from './season';
import type { World } from './world';

const inMarch = (): World => ({ ...createWorld('furia'), date: '2027-03-01' });

describe('Liga de base', () => {
  it('uma rodada tem um jogo para cada 2 academies e a tabela fecha (vitórias = derrotas)', () => {
    const w = playBaseRound(inMarch(), createRng(1));
    const rows = baseStandings(w);
    expect(rows).toHaveLength(102);
    const wins = rows.reduce((s, r) => s + r.w, 0);
    const losses = rows.reduce((s, r) => s + r.l, 0);
    expect(wins).toBe(51);
    expect(losses).toBe(51);
    expect(w.baseLeague.lastRound).toHaveLength(51);
  });

  it('academy com menos de 5 perde por W.O.', () => {
    let w = inMarch();
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: w.teams.furia.academyIds.slice(0, 4) } } };
    w = playBaseRound(w, createRng(2));
    const mine = w.baseLeague.lastRound.find((g) => g.a === 'furia' || g.b === 'furia')!;
    expect(mine.wo).toBe(true);
    expect(mine.winner).not.toBe('furia');
    expect(w.baseLeague.table.furia.l).toBe(1);
  });

  it('os jovens ganham crescimento por mapa jogado', () => {
    const before = inMarch();
    const after = playBaseRound(before, createRng(3));
    const id = before.teams.furia.academyIds[0];
    expect(after.players[id].growth).not.toEqual(before.players[id].growth);
  });

  it('não há rodada fora da temporada (dezembro e janeiro)', () => {
    const w = { ...createWorld('furia'), date: '2026-12-07' };
    expect(playBaseRound(w, createRng(4)).baseLeague.lastRound).toHaveLength(0);
  });

  it('a temporada zera a tabela', () => {
    expect(newBaseSeason(2028)).toEqual({ season: 2028, table: {}, lastRound: [] });
  });
});
