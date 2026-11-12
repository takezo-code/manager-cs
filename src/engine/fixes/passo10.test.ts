import { describe, expect, it } from 'vitest';
import { promoteMine } from '../academy';
import { generateAmateurs, refreshAmateurs } from '../amateurs';
import { baseOvr } from '../form';
import { createRng } from '../rng';
import { estimatePotential } from '../scout';
import { createWorld } from '../season';

describe('Ajustes do passo 10', () => {
  it('ids de amadores nunca se repetem (no lote e com o banco atual)', () => {
    // Semente pequena força colisões no sorteio de 5 dígitos.
    const batch = generateAmateurs(createRng(7), 2000, '2027-01-01');
    expect(new Set(batch.map((a) => a.player.id)).size).toBe(batch.length);
    const w = createWorld('furia');
    for (let i = 0; i < 30; i++) {
      const out = refreshAmateurs({ ...w, date: '2026-11-11' }, createRng(i));
      expect(new Set(out.amateurs.map((a) => a.player.id)).size).toBe(out.amateurs.length);
    }
  });

  it('a faixa do olheiro nunca fica abaixo do OVR atual', () => {
    const w = createWorld('furia');
    const youth = Object.values(w.players).filter((p) => p.squad === 'academy');
    for (const p of youth)
      for (const level of [1, 2, 3, 4, 5]) expect(estimatePotential(p, level).min).toBeGreaterThanOrEqual(Math.min(99, baseOvr(p)));
  });

  it('promover só jovem da sua academy', () => {
    const w = createWorld('furia');
    expect(promoteMine(w, w.teams.furia.academyIds[0]).ok).toBe(true);
    expect(promoteMine(w, w.teams.mouz.academyIds[0]).ok).toBe(false);
  });
});
