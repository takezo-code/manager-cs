import { describe, expect, it } from 'vitest';
import { dailyRumor } from '../media/news';
import { say } from '../media/templates';
import { tweetsForDay } from '../media/twitter';
import { createRng } from '../rng';
import { createWorld } from '../season';
import type { World } from '../world';

describe('Ajustes do passo 13', () => {
  const w0 = { ...createWorld('furia'), date: '2027-12-20' };
  const offer = { id: 'o1', fromTeamId: 'g2', playerId: w0.teams.furia.playerIds[0], fee: 1, date: w0.date, expires: '2027-12-30' };

  it('a mesma proposta não vira rumor duas vezes', () => {
    let w: World = { ...w0, offers: [offer] };
    let count = 0;
    for (let i = 0; i < 60; i++) {
      w = dailyRumor({ ...w, date: `2027-12-${String(20 + (i % 10)).padStart(2, '0')}` }, createRng(i));
      count = w.news.filter((n) => n.ref === offer.id).length;
    }
    expect(count).toBe(1);
  });

  it('o jornalista repercute o jogador certo (pelo id, não pelo nick)', () => {
    let w: World = { ...w0, offers: [offer] };
    for (let i = 0; i < 50 && !w.news.some((n) => n.rumor); i++) w = dailyRumor(w, createRng(i));
    const rumor = w.news.find((n) => n.rumor)!;
    expect(rumor.playerId).toBeTruthy();
    const tw = tweetsForDay(w0, w, {}, createRng(1)).find((t) => t.author.kind === 'jornalista')!;
    expect(tw.text).toContain(w.players[rumor.playerId!].nick);
  });

  it('template com variável faltando não trava o jogo', () => {
    expect(() => say('news', 'transferencia', { jogador: 'x' }, 's')).not.toThrow();
    expect(say('news', 'transferencia', { jogador: 'x' }, 's')).not.toMatch(/[{}]/);
  });
});
