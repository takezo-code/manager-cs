import { describe, expect, it } from 'vitest';
import { TRAINING } from './config';
import { createWorld } from './season';
import { trainDay } from './training';
import type { World } from './world';

const setTraining = (w: World, mode: 'treino' | 'descanso' | 'dividido', focus: 'mira' | 'utilidade' | 'taticas' | 'mirage'): World => ({
  ...w,
  teams: { ...w.teams, furia: { ...w.teams.furia, training: { mode, focus } } },
});

describe('Treino e descanso', () => {
  it('30 dias de treino com foco em mira sobem a Mira e gastam energia', () => {
    let w = setTraining(createWorld('furia'), 'treino', 'mira');
    const mir = w.players.yuurih.baseAttributes.MIR;
    for (let d = 0; d < 30; d++) w = trainDay(w, 'furia');
    expect(w.players.yuurih.baseAttributes.MIR).toBeGreaterThan(mir);
    expect(w.players.yuurih.energy).toBeLessThan(100);
  });

  it('descanso recupera energia e sobe um pouco a satisfação', () => {
    let w = setTraining(createWorld('furia'), 'descanso', 'mira');
    w = { ...w, players: { ...w.players, yuurih: { ...w.players.yuurih, energy: 50 } } };
    const sat = w.players.yuurih.satisfaction;
    for (let d = 0; d < 5; d++) w = trainDay(w, 'furia');
    expect(w.players.yuurih.energy).toBe(60);
    expect(w.players.yuurih.satisfaction).toBeGreaterThan(sat);
  });

  it('foco em mapa aumenta a força do time no mapa, até 95', () => {
    let w = setTraining(createWorld('furia'), 'treino', 'mirage');
    const before = w.teams.furia.mapStrength.mirage;
    for (let d = 0; d < 10; d++) w = trainDay(w, 'furia');
    expect(w.teams.furia.mapStrength.mirage).toBeGreaterThan(before);
    for (let d = 0; d < 400; d++) w = trainDay(w, 'furia');
    expect(w.teams.furia.mapStrength.mirage).toBeLessThanOrEqual(95);
  });

  it('o ganho de treino para em +6 por atributo', () => {
    let w = setTraining(createWorld('furia'), 'treino', 'utilidade');
    const utl = w.players.yuurih.baseAttributes.UTL;
    for (let d = 0; d < 2000; d++) {
      w = trainDay(w, 'furia');
      w = { ...w, players: { ...w.players, yuurih: { ...w.players.yuurih, energy: 100 } } };
    }
    expect(w.players.yuurih.baseAttributes.UTL).toBe(Math.min(99, utl + TRAINING.maxGain));
  });
});
