import { describe, expect, it } from 'vitest';
import { addToAcademy, generateYouth } from '../academy';
import { createRng } from '../rng';
import { createWorld } from '../season';
import { markRevealed } from './academyCareer';
import { retireTier2 } from './model';

describe('Ajustes pequenos do tier 2', () => {
  it('só vira "revelado" depois de 1 mês na academy', () => {
    let w = { ...createWorld('furia', 1, undefined, { academy: true }), date: '2027-03-31' };
    const [fresh] = generateYouth(w, createRng(5), 'furia', 1);
    w = addToAcademy(w, 'furia', [fresh]);
    const april = markRevealed({ ...w, date: '2027-04-01' });
    expect(april.players[fresh.id].revealed).toBeFalsy();
    const may = markRevealed({ ...april, date: '2027-05-01' });
    expect(may.players[fresh.id].revealed).toBe(true);
  });

  it('jogador fictício com 32 anos ou mais se aposenta e é substituído por um jovem', () => {
    const w = createWorld('furia');
    const team = Object.values(w.tier2.teams)[0];
    const old = team.playerIds[0];
    const aged = { ...w, tier2: { ...w.tier2, players: { ...w.tier2.players, [old]: { ...w.tier2.players[old], age: 32 } } } };
    const out = retireTier2(aged, createRng(1));
    const roster = out.tier2.teams[team.id].playerIds;
    expect(roster).toHaveLength(team.playerIds.length);
    expect(roster).not.toContain(old);
    expect(out.tier2.players[old]).toBeUndefined();
    const rookie = out.tier2.players[roster.find((id) => !team.playerIds.includes(id))!];
    expect(rookie.age).toBeLessThanOrEqual(22);
  });
});
