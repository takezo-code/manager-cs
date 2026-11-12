import { describe, expect, it } from 'vitest';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';
import { assignGoals, clubSize, evaluateSeason, seasonGoals } from './board';

const rankOf = (w: World, teamId: string, rank: number): World => ({ ...w, teams: { ...w.teams, [teamId]: { ...w.teams[teamId], hltvRank: rank } } });

describe('Diretoria e metas', () => {
  it('tamanho do clube pelo ranking: grande 1–5, médio 6–15, pequeno 16–32', () => {
    const w = createWorld('furia');
    expect(clubSize(rankOf(w, 'furia', 5).teams.furia)).toBe('grande');
    expect(clubSize(rankOf(w, 'furia', 6).teams.furia)).toBe('medio');
    expect(clubSize(rankOf(w, 'furia', 16).teams.furia)).toBe('pequeno');
  });

  it('metas por tamanho', () => {
    const w = createWorld('furia');
    expect(seasonGoals(rankOf(w, 'furia', 2).teams.furia).map((g) => g.kind)).toEqual(['titulo', 'top5', 'caixa']);
    expect(seasonGoals(rankOf(w, 'furia', 10).teams.furia).map((g) => g.kind)).toEqual(['top10', 'major_top8', 'caixa']);
    expect(seasonGoals(rankOf(w, 'furia', 25).teams.furia).map((g) => g.kind)).toEqual(['jogar_major', 'top20', 'caixa']);
  });

  it('assumir depois de outubro: primeira avaliação no fim do ano seguinte', () => {
    const w = createWorld('furia');
    expect(w.manager.goals.length).toBe(3);
    expect(w.manager.goalsSeason).toBe(2027);
    expect(assignGoals({ ...w, date: '2027-05-10' }, 'furia').manager.goalsSeason).toBe(2027);
  });

  it('avaliação: metas batidas dão confiança, aporte e reputação; falhas tiram', () => {
    let w = { ...createWorld('furia'), date: '2028-01-01' };
    w = { ...w, manager: { ...w.manager, goalsSeason: 2027, clubSize: 'grande', goals: seasonGoals(w.teams.furia).slice(0, 0).concat([{ kind: 'top5', text: '' }, { kind: 'caixa', text: '' }, { kind: 'titulo', text: '' }]) } };
    w = rankOf(w, 'furia', 3);
    const money = w.teams.furia.money;
    const out = evaluateSeason(w).world;
    // top5 e caixa batidas (+10 +10), título falhou (−22): 60 + 20 − 22 = 58
    expect(out.manager.confidence).toBe(58);
    expect(out.teams.furia.money).toBe(money + 2 * 300_000);
    expect(out.manager.reputation).toBeCloseTo(10 + 3 + 3 - 2);
    expect(out.manager.goalsSeason).toBe(2028);
    expect(out.managerTeamId).toBe('furia');
  });

  it('confiança abaixo de 20 depois da avaliação: demitido', () => {
    let w = { ...createWorld('furia'), date: '2028-01-01' };
    w = { ...rankOf(w, 'furia', 30), manager: { ...w.manager, confidence: 30, goalsSeason: 2027, clubSize: 'medio', goals: [{ kind: 'top10', text: '' }] } };
    const out = evaluateSeason(w);
    expect(out.world.managerTeamId).toBe('');
    expect(out.world.manager.stints.at(-1)).toMatchObject({ teamId: 'furia', to: '2028-01-01', reason: 'demitido' });
    // 10 − 2 (meta) − 10 (demissão) fica no piso 0.
    expect(out.world.manager.reputation).toBe(0);
    expect(out.world.inbox.length).toBe(0);
    expect(out.events.some((e) => e.text.includes('demitido'))).toBe(true);
  });

  it('dailyTick avalia na virada do ano', () => {
    let w = { ...createWorld('furia'), date: '2027-12-31', calendar: [] };
    w = { ...w, manager: { ...w.manager, goalsSeason: 2027 } };
    const out = dailyTick(w).world;
    expect(out.manager.goalsSeason).toBe(2028);
  });
});
