import { describe, expect, it } from 'vitest';
import { generateAmateurs, isHiddenGem, refreshAmateurs, signAmateur, visibleAmateurs } from './amateurs';
import { AMATEURS, SCOUT } from './config';
import { createRng } from './rng';
import { createWorld } from './season';
import type { World } from './world';

const world = (): World => createWorld('furia');
const withScout = (w: World, level: number): World => ({ ...w, teams: { ...w.teams, furia: { ...w.teams.furia, scoutLevel: level } } });

describe('GC/FACEIT', () => {
  it('o banco começa com 40 amadores de 16 a 19 anos, fora dos jogadores do jogo', () => {
    const w = world();
    expect(w.amateurs).toHaveLength(AMATEURS.poolSize);
    for (const a of w.amateurs) {
      expect(a.player.age).toBeGreaterThanOrEqual(16);
      expect(a.player.age).toBeLessThanOrEqual(19);
      expect(w.players[a.player.id]).toBeUndefined();
      expect(a.platform === 'FACEIT' ? a.level <= 10 : a.level <= 21).toBe(true);
    }
  });

  it('o olheiro decide quantos amadores aparecem', () => {
    const w = world();
    expect(visibleAmateurs(withScout(w, 1))).toHaveLength(SCOUT.levels[0].visible);
    expect(visibleAmateurs(withScout(w, 5))).toHaveLength(SCOUT.levels[4].visible);
  });

  it('joias escondidas (nível baixo, POT alto) só aparecem com olheiro 4+', () => {
    let w = world();
    const gem = { ...w.amateurs[0], platform: 'FACEIT' as const, level: 3, player: { ...w.amateurs[0].player, potential: 90 } };
    w = { ...w, amateurs: [gem, ...w.amateurs.slice(1)] };
    expect(isHiddenGem(gem)).toBe(true);
    expect(visibleAmateurs(withScout(w, 3)).some((a) => a.player.id === gem.player.id)).toBe(false);
    expect(visibleAmateurs(withScout(w, 4)).some((a) => a.player.id === gem.player.id)).toBe(true);
  });

  it('contratar cobra as luvas e coloca o amador na academy', () => {
    let w = world();
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: w.teams.furia.academyIds.slice(0, 4) } } };
    const a = visibleAmateurs(w)[0];
    const money = w.teams.furia.money;
    const r = signAmateur(w, a.player.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.academyIds).toContain(a.player.id);
    expect(r.world.players[a.player.id].squad).toBe('academy');
    expect(r.world.players[a.player.id].contract?.teamId).toBe('furia');
    expect(r.world.teams.furia.money).toBe(money - a.fee);
    expect(r.world.amateurs.some((x) => x.player.id === a.player.id)).toBe(false);
  });

  it('academy cheia (6) não contrata', () => {
    let w = world();
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: [...w.teams.furia.academyIds, 'x'] } } };
    const r = signAmateur(w, visibleAmateurs(w)[0].player.id);
    expect(r.ok).toBe(false);
  });

  it('todo mês parte do banco é trocada, mantendo 40', () => {
    const w = world();
    const out = refreshAmateurs(w, createRng(3));
    expect(out.amateurs).toHaveLength(AMATEURS.poolSize);
    const kept = out.amateurs.filter((a) => w.amateurs.some((b) => b.player.id === a.player.id)).length;
    expect(kept).toBeLessThan(AMATEURS.poolSize);
    expect(kept).toBeGreaterThan(AMATEURS.poolSize / 2);
    expect(generateAmateurs(createRng(1), 5, w.date)).toHaveLength(5);
  });
});
