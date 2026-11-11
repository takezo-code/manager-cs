import { describe, expect, it } from 'vitest';
import { SCOUT } from './config';
import { baseOvr } from './form';
import { estimatePotential, upgradeScout } from './scout';
import { createWorld } from './season';

describe('Olheiro', () => {
  const w = createWorld('furia');
  const youth = w.players[w.teams.furia.academyIds[0]];

  it('nível 5: faixa estreita que contém o POT real', () => {
    const e = estimatePotential(youth, 5);
    expect(e.max - e.min).toBe(2 * SCOUT.levels[4].range);
    expect(youth.potential).toBeGreaterThanOrEqual(e.min);
    expect(youth.potential).toBeLessThanOrEqual(e.max);
  });

  it('nível 1: faixa larga', () => {
    const e = estimatePotential(youth, 1);
    expect(e.max - e.min).toBeGreaterThan(estimatePotential(youth, 5).max - estimatePotential(youth, 5).min);
  });

  it('a estimativa é estável para o mesmo jogador e nível', () => {
    expect(estimatePotential(youth, 2)).toEqual(estimatePotential(youth, 2));
  });

  it('no nível baixo às vezes erra: alguma faixa não contém o POT real', () => {
    const all = Object.values(createWorld('furia').players).filter((p) => p.squad === 'academy');
    const misses = all.filter((p) => {
      const e = estimatePotential(p, 1);
      return p.potential < e.min || p.potential > e.max;
    });
    expect(misses.length).toBeGreaterThan(0);
  });

  it('alertas só a partir do nível 4', () => {
    const star = { ...youth, potential: 92 };
    expect(estimatePotential(star, 3).alerts).toHaveLength(0);
    expect(estimatePotential(star, 4).alerts).toContain('Pode ser a nova revelação');
    const raw = { ...youth, potential: baseOvr(youth) + 20 };
    expect(estimatePotential(raw, 5).alerts).toContain('Grande potencial de melhora');
  });

  it('melhorar o olheiro cobra o preço do nível; no 5 não sobe mais', () => {
    let world = createWorld('furia');
    const money = world.teams.furia.money;
    const r = upgradeScout(world);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    world = r.world;
    expect(world.teams.furia.scoutLevel).toBe(2);
    expect(world.teams.furia.money).toBe(money - SCOUT.upgradePrices[0]);
    world = { ...world, teams: { ...world.teams, furia: { ...world.teams.furia, scoutLevel: 5 } } };
    expect(upgradeScout(world).ok).toBe(false);
  });
});
