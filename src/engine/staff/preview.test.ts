import { describe, expect, it } from 'vitest';
import { MAP_IDS } from '../types';
import { addDays } from '../date';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { rivalPreview } from './preview';

const withLei = (w: World, lei: number): World => {
  const id = w.teams.furia.staff.analista!;
  return { ...w, staff: { ...w.staff, [id]: { ...w.staff[id], attrs: { ...w.staff[id].attrs, LEI: lei } } } };
};

describe('Prévia do analista', () => {
  const w = createWorld('furia');

  it('Leitura 85+: os 2 mapas mais fortes e os 2 mais fracos, exatos', () => {
    const rival = w.teams.vitality;
    const sorted = [...MAP_IDS].sort((a, b) => rival.mapStrength[b] - rival.mapStrength[a]);
    const p = rivalPreview(withLei(w, 90), 'vitality');
    expect(p.strong).toEqual(sorted.slice(0, 2));
    expect(p.weak).toEqual(sorted.slice(-2).reverse());
  });

  it('Leitura 40: erra em parte dos rivais', () => {
    const low = withLei(w, 40);
    const wrong = Object.keys(w.teams).filter((id) => {
      if (id === 'furia') return false;
      const t = w.teams[id];
      const sorted = [...MAP_IDS].sort((a, b) => t.mapStrength[b] - t.mapStrength[a]);
      const p = rivalPreview(low, id);
      return p.strong.join() !== sorted.slice(0, 2).join() || p.weak.join() !== sorted.slice(-2).reverse().join();
    });
    expect(wrong.length).toBeGreaterThan(0);
  });

  it('é estável para o mesmo rival e data', () => {
    const low = withLei(w, 40);
    expect(rivalPreview(low, 'mouz')).toEqual(rivalPreview(low, 'mouz'));
  });
});

describe('Comissão na temporada', () => {
  it('dailyTick: curso termina, renovação avisa e a IA preenche vagas', () => {
    let w: World = { ...createWorld('furia'), date: '2027-03-09', calendar: [] };
    const ana = w.teams.furia.staff.analista!;
    const tec = w.teams.mouz.staff.tecnico!;
    const lei = w.staff[ana].attrs.LEI!;
    w = {
      ...w,
      teams: { ...w.teams, mouz: { ...w.teams.mouz, staff: { ...w.teams.mouz.staff, tecnico: null } } },
      staff: {
        ...w.staff,
        [tec]: { ...w.staff[tec], teamId: null, contract: null },
        [ana]: { ...w.staff[ana], course: { attr: 'LEI', until: '2027-03-10' }, contract: { ...w.staff[ana].contract!, endDate: addDays('2027-03-10', 60) } },
      },
    };
    const out = dailyTick(w).world;
    expect(out.staff[ana].attrs.LEI).toBe(Math.min(95, lei + 2));
    expect(out.inbox.some((i) => i.kind === 'staff_renovacao' && i.staffId === ana)).toBe(true);
    expect(out.teams.mouz.staff.tecnico).not.toBeNull();
  });
});

describe('Correções da revisão', () => {
  it('entre um dia e outro do campeonato, a próxima série do seu time já está sorteada', async () => {
    const { playDay } = await import('../tournament/run');
    const { createLegacyTournament } = await import('../tournament/legacy.testutil');
    const { INITIAL_TEAMS } = await import('../../data');
    const { buildYear } = await import('../calendar');
    const { nextOpponent } = await import('./preview');
    const base = createWorld('furia');
    const t0 = createLegacyTournament('iem', INITIAL_TEAMS, 5);
    const out = playDay(t0, base.teams, base.players);
    const ev = { ...buildYear(2026).find((e) => e.templateId === 'iem-china')!, status: 'em_andamento' as const, tournament: out.tournament };
    const w = { ...base, calendar: [ev] };
    const next = nextOpponent(w);
    expect(next).not.toBeNull();
    // A prévia é a mesma até a série acontecer (não muda de um dia para o outro).
    const low = withLei(w, 40);
    expect(next!.rivalId).not.toBe('furia');
    expect(rivalPreview(low, next!.rivalId, next!.seriesId)).toEqual(rivalPreview({ ...low, date: addDays(low.date, 1) }, next!.rivalId, next!.seriesId));
  });

  it('IA sem caixa ainda preenche a vaga com o profissional mais barato', async () => {
    const { staffMarketDay } = await import('./market');
    let w = createWorld('furia');
    const old = w.teams.mouz.staff.tecnico!;
    w = {
      ...w,
      teams: { ...w.teams, mouz: { ...w.teams.mouz, money: -50_000, staff: { ...w.teams.mouz.staff, tecnico: null } } },
      staff: { ...w.staff, [old]: { ...w.staff[old], teamId: null, contract: null } },
    };
    expect(staffMarketDay(w).world.teams.mouz.staff.tecnico).not.toBeNull();
  });
});
