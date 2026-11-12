import { describe, expect, it } from 'vitest';
import { placeFactorOf } from '../ranking';
import { createRng } from '../rng';
import { createWorld } from '../season';
import type { World } from '../world';
import { fanMood } from './fans';
import { baseReception, makePost, postContext } from './instagram';

const w0 = createWorld('furia');
const day = w0.date;
const win = (w: World, other = 'mouz'): World => ({ ...w, seriesLog: [...w.seriesLog, { date: day, winner: 'furia', loser: other, winnerRoster: [] }] });
const loss = (w: World, other = 'mouz'): World => ({ ...w, seriesLog: [...w.seriesLog, { date: day, winner: other, loser: 'furia', winnerRoster: [] }] });

describe('Instagram', () => {
  it('contratação: forte +6, normal +2, nada recente −2', () => {
    const star = Object.values(w0.players).find((p) => p.teamId === 'furia')!;
    const sign = (ovrHigh: boolean): World => ({
      ...w0,
      transferLog: [{ date: day, kind: 'transferencia', playerId: star.id, fromTeamId: 'mouz', toTeamId: 'furia', fee: 1 }],
      players: { ...w0.players, [star.id]: { ...star, baseAttributes: Object.fromEntries(Object.keys(star.baseAttributes).map((k) => [k, ovrHigh ? 92 : 70])) as typeof star.baseAttributes } },
    });
    expect(baseReception(postContext(sign(true)), 'contratacao')).toBe(6);
    expect(baseReception(postContext(sign(false)), 'contratacao')).toBe(2);
    expect(baseReception(postContext(w0), 'contratacao')).toBe(-2);
  });

  it('vitória +3 / −4; desculpas +4 / −1; uniforme +2 / 0', () => {
    expect(baseReception(postContext(win(w0)), 'vitoria')).toBe(3);
    expect(baseReception(postContext(loss(w0)), 'vitoria')).toBe(-4);
    expect(baseReception(postContext(loss(loss(w0))), 'desculpas')).toBe(4);
    expect(baseReception(postContext(w0), 'desculpas')).toBe(-1);
    expect(baseReception(postContext(w0), 'uniforme')).toBe(2);
    const posted = { ...w0, posts: [{ id: 'x', date: day, kind: 'uniforme' as const, text: '', reception: 0, comments: [] }] };
    expect(baseReception(postContext(posted), 'uniforme')).toBe(0);
  });

  it('zoeira: +3 depois de título ou clássico; −8 depois de eliminação; 0 no resto', () => {
    const titled = { ...w0, manager: { ...w0.manager, titles: [{ event: 'X', date: day, teamId: 'furia' }] } };
    expect(baseReception(postContext(titled), 'zoeira')).toBe(3);
    const out = { ...w0, results: [{ eventId: 'e', teamId: 'furia', date: day, placeFactor: placeFactorOf(9), weight: 1, roster: [] }] };
    expect(baseReception(postContext(out), 'zoeira')).toBe(-8);
    expect(baseReception(postContext(w0), 'zoeira')).toBe(0);
  });

  it('postar mexe na torcida, gera 6 a 10 comentários e sobe a Comunicação quando vai bem', () => {
    const r = makePost(win(w0), 'vitoria', createRng(1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const post = r.world.posts[0];
    expect(post.comments.length).toBeGreaterThanOrEqual(6);
    expect(post.comments.length).toBeLessThanOrEqual(10);
    expect(fanMood(r.world, 'furia')).toBeGreaterThan(fanMood(w0, 'furia'));
    expect(r.world.manager.attrs.COM).toBeCloseTo(30.5);
    expect(post.text).not.toMatch(/[{}]/);
  });

  it('mesmo tipo seguido vale a metade', () => {
    const a = makePost(win(w0), 'vitoria', createRng(1));
    if (!a.ok) throw new Error('falhou');
    const tomorrow = { ...a.world, date: '2026-11-12' };
    expect(postContext(tomorrow).lastKind).toBe('vitoria');
    expect(baseReception(postContext(tomorrow), 'vitoria')).toBe(1.5);
  });

  it('segundo post no mesmo dia: erro e nada muda; desempregado não posta', () => {
    const a = makePost(w0, 'uniforme', createRng(1));
    if (!a.ok) throw new Error('falhou');
    const b = makePost(a.world, 'zoeira', createRng(2));
    expect(b.ok).toBe(false);
    expect(makePost({ ...w0, managerTeamId: '' }, 'uniforme', createRng(1)).ok).toBe(false);
  });
});
