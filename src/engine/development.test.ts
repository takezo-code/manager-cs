import { describe, expect, it } from 'vitest';
import { DEVELOPMENT } from './config';
import { ageUp, developPlayer, monthlyDevelopment, monthlyGrowth } from './development';
import { baseOvr } from './form';
import { createWorld } from './season';
import type { Player } from './types';

const base = (w: ReturnType<typeof createWorld>, id: string) => w.players[id];

describe('Desenvolvimento por idade', () => {
  it('curva: jovem cresce, auge estável, veterano cai', () => {
    expect(monthlyGrowth(17)).toBeGreaterThan(monthlyGrowth(20));
    expect(monthlyGrowth(20)).toBeGreaterThan(0);
    expect(monthlyGrowth(24)).toBe(0);
    expect(monthlyGrowth(28)).toBeLessThan(0);
    expect(monthlyGrowth(34)).toBeLessThan(monthlyGrowth(31));
  });

  it('jovem cresce rumo ao POT e nunca passa dele', () => {
    const w = createWorld('furia');
    let p: Player = { ...base(w, 'kyousuke'), age: 17, potential: baseOvr(base(w, 'kyousuke')) + 4 };
    const start = baseOvr(p);
    for (let m = 0; m < 12; m++) p = developPlayer(p, monthlyGrowth(p.age));
    expect(baseOvr(p)).toBeGreaterThan(start);
    for (let m = 0; m < 120; m++) p = developPlayer(p, monthlyGrowth(p.age));
    expect(baseOvr(p)).toBeLessThanOrEqual(p.potential);
  });

  it('veterano de 34 anos cai, mas nenhum atributo passa abaixo do mínimo', () => {
    const w = createWorld('furia');
    let p: Player = { ...base(w, 'karrigan'), age: 34 };
    const start = baseOvr(p);
    for (let m = 0; m < 12; m++) p = developPlayer(p, monthlyGrowth(p.age));
    expect(baseOvr(p)).toBeLessThan(start);
    for (let m = 0; m < 600; m++) p = developPlayer(p, monthlyGrowth(p.age));
    expect(Math.min(...Object.values(p.baseAttributes))).toBeGreaterThanOrEqual(DEVELOPMENT.minAttr);
  });

  it('todo mundo faz aniversário em 1º de janeiro', () => {
    const w = createWorld('furia');
    expect(ageUp(w).players.zywoo.age).toBe(w.players.zywoo.age + 1);
  });

  it('o desenvolvimento mensal vale para todos os jogadores', () => {
    const w = createWorld('furia');
    const old = { ...w, players: { ...w.players, karrigan: { ...w.players.karrigan, age: 36 } } };
    let out: typeof old = old;
    for (let m = 0; m < 6; m++) out = monthlyDevelopment(out) as typeof old;
    expect(baseOvr(out.players.karrigan)).toBeLessThan(baseOvr(old.players.karrigan));
  });
});

