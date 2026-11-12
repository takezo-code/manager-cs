import { describe, expect, it } from 'vitest';
import { addToAcademy, generateYouth } from '../academy';
import { createRng } from '../rng';
import { createWorld } from '../season';
import { markRevealed } from './academyCareer';

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
});
