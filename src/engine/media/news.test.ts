import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { mediaDay } from './day';
import { dailyRumor, pushNews } from './news';

const today = (w: World) => w.date;
const noRumor = createRng(1);

describe('Notícias', () => {
  const w0 = createWorld('furia');
  const someone = w0.teams.mouz.playerIds[0];

  it('transferência e multa do dia viram notícia', () => {
    const next = { ...w0, transferLog: [{ date: today(w0), kind: 'transferencia' as const, playerId: someone, fromTeamId: 'mouz', toTeamId: 'furia', fee: 500_000 }] };
    const out = mediaDay(w0, next, {}, noRumor);
    expect(out.news[0].kind).toBe('transferencia');
    expect(out.news[0].title).toContain(w0.players[someone].nick);
    const multa = { ...w0, transferLog: [{ date: today(w0), kind: 'multa' as const, playerId: someone, fromTeamId: 'mouz', toTeamId: 'g2', fee: 900_000 }] };
    expect(mediaDay(w0, multa, {}, noRumor).news.some((n) => n.kind === 'multa')).toBe(true);
  });

  it('evento encerrado: campeão e MVP', () => {
    const ev = w0.calendar[0];
    const prev = { ...w0, calendar: [{ ...ev, status: 'em_andamento' as const }] };
    const mvp = w0.teams.vitality.playerIds[0];
    const next = {
      ...w0,
      calendar: [{ ...ev, status: 'encerrado' as const, tournament: { ...(ev.tournament ?? ({} as never)), championId: 'vitality', name: ev.name } }],
      players: { ...w0.players, [mvp]: { ...w0.players[mvp], awards: [{ kind: 'MVP' as const, event: ev.name, date: today(w0) }] } },
    };
    const kinds = mediaDay(prev, next, {}, noRumor).news.map((n) => n.kind);
    expect(kinds).toContain('titulo');
    expect(kinds).toContain('mvp');
  });

  it('manager demitido e contratado; salário atrasado; quer sair; saída negada; fases', () => {
    const p = w0.teams.furia.playerIds[0];
    const fired = { ...w0, managerTeamId: '', manager: { ...w0.manager, stints: [{ ...w0.manager.stints[0], to: today(w0), reason: 'demitido' }] } };
    expect(mediaDay(w0, fired, {}, noRumor).news.some((n) => n.kind === 'manager_demitido')).toBe(true);
    const hired = { ...fired, managerTeamId: 'big' };
    expect(mediaDay(fired, hired, {}, noRumor).news.some((n) => n.kind === 'manager_contratado')).toBe(true);
    const late = { ...w0, teams: { ...w0.teams, furia: { ...w0.teams.furia, lateMonths: 1 } } };
    expect(mediaDay(w0, late, {}, noRumor).news.some((n) => n.kind === 'salarios_atrasados')).toBe(true);
    const unhappy = { ...w0, players: { ...w0.players, [p]: { ...w0.players[p], satisfaction: 10, mood: { ...w0.players[p].mood, exitDenied: true }, phase: 'ma_fase' as const } } };
    const kinds = mediaDay(w0, unhappy, {}, noRumor).news.map((n) => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(['quer_sair', 'saida_negada', 'fase_ma']));
  });

  it('rumor: 15% por dia (40% nas férias); verdadeiro quando há proposta real', () => {
    let n = 0;
    for (let i = 0; i < 400; i++) if (dailyRumor({ ...w0, date: '2027-03-10' }, createRng(i)).news.length) n++;
    expect(n / 400).toBeGreaterThan(0.08);
    expect(n / 400).toBeLessThan(0.22);
    let v = 0;
    for (let i = 0; i < 400; i++) if (dailyRumor({ ...w0, date: '2027-12-20' }, createRng(i)).news.length) v++;
    expect(v / 400).toBeGreaterThan(0.3);
    const offer = { id: 'o', fromTeamId: 'g2', playerId: w0.teams.furia.playerIds[0], fee: 1, date: w0.date, expires: w0.date };
    let real = 0;
    for (let i = 0; i < 200; i++) {
      const r = dailyRumor({ ...w0, date: '2027-12-20', offers: [offer] }, createRng(i)).news[0];
      if (r && r.title.includes(w0.players[offer.playerId].nick) && r.teamIds.includes('g2')) real++;
    }
    expect(real).toBeGreaterThan(0);
  });

  it('a lista guarda no máximo 200 notícias', () => {
    let w = w0;
    for (let i = 0; i < 230; i++) w = pushNews(w, 'salarios_atrasados', { time: 'X' }, ['furia'], `s${i}`);
    expect(w.news).toHaveLength(200);
  });

  it('desempregado continua recebendo notícias pelo dailyTick', () => {
    let w: World = { ...w0, managerTeamId: '' };
    for (let i = 0; i < 40; i++) w = dailyTick(w).world;
    expect(w.news.length).toBeGreaterThan(0);
  });
});
