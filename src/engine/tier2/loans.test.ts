import { describe, expect, it } from 'vitest';
import { academyYearEnd } from '../academy';
import { signAmateur, visibleAmateurs } from '../amateurs';
import { payroll } from '../finance/monthly';
import { withStandins } from '../schedule';
import { createWorld } from '../season';
import type { World } from '../world';
import { loanPlayer, loansDay, recallLoan } from './loans';
import { academyTeam, academyTeamId } from './model';

/** Time real fora do top 32 com vaga. */
const target = (w: World) => Object.values(w.teams).find((t) => t.hltvRank > 32 && t.playerIds.length < 6)!.id;

describe('Empréstimos para times reais', () => {
  const w0 = createWorld('furia');
  const youth = w0.teams.furia.academyIds[0];

  it('só jovem da sua academy, só para time real fora do top 32 com vaga, por 3/6/12 meses', () => {
    const to = target(w0);
    expect(loanPlayer(w0, youth, to, 6).ok).toBe(true);
    expect(loanPlayer(w0, w0.teams.mouz.academyIds[0], to, 6).ok).toBe(false);
    expect(loanPlayer(w0, youth, academyTeamId('mouz'), 6).ok).toBe(false);
    expect(loanPlayer(w0, youth, 'mouz', 6).ok).toBe(false); // top 32
    expect(loanPlayer(w0, youth, to, 5).ok).toBe(false);
    const full = { ...w0, teams: { ...w0.teams, [to]: { ...w0.teams[to], playerIds: [...w0.teams[to].playerIds, 'a', 'b', 'c', 'd', 'e', 'f', 'g'].slice(0, 7) } } };
    expect(loanPlayer(full, youth, to, 6).ok).toBe(false);
    const r = loanPlayer(w0, youth, to, 6);
    if (r.ok) expect(r.world.players[youth].loan).toMatchObject({ teamId: to, salaryShare: 0.5 });
  });

  it('folha dividida ao meio; joga pelo time do empréstimo e não pela academy', () => {
    const to = target(w0);
    const r = loanPlayer(w0, youth, to, 6);
    if (!r.ok) throw new Error(r.error);
    const sal = w0.players[youth].contract!.salary;
    expect(payroll(r.world, r.world.teams.furia)).toBe(payroll(w0, w0.teams.furia) - sal / 2);
    expect(payroll(r.world, r.world.teams[to])).toBe(payroll(w0, w0.teams[to]) + sal / 2);
    expect(withStandins(r.world, [to])[to].playerIds).toContain(youth);
    expect(academyTeam(r.world, 'furia').playerIds).not.toContain(youth);
  });

  it('emprestado não ocupa vaga da academy (máximo 6 sem contar os emprestados)', () => {
    let w = w0;
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: [...w.teams.furia.academyIds, 'x'] } }, players: { ...w.players, x: { ...w.players[youth], id: 'x' } } };
    expect(signAmateur(w, visibleAmateurs(w)[0].player.id).ok).toBe(false);
    const r = loanPlayer(w, youth, target(w), 3);
    if (!r.ok) throw new Error(r.error);
    expect(signAmateur(r.world, visibleAmateurs(r.world)[0].player.id).ok).toBe(true);
  });

  it('chamar de volta custa US$ 20 mil; no fim do prazo volta sozinho', () => {
    const r = loanPlayer(w0, youth, target(w0), 3);
    if (!r.ok) throw new Error(r.error);
    const back = recallLoan(r.world, youth);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.world.players[youth].loan).toBeFalsy();
      expect(back.world.teams.furia.money).toBe(r.world.teams.furia.money - 20_000);
    }
    const later = loansDay({ ...r.world, date: '2027-03-15' });
    expect(later.world.players[youth].loan).toBeFalsy();
    expect(later.events.some((e) => e.text.includes(w0.teams[target(w0)].name))).toBe(true);
  });

  it('faz 20 anos emprestado: o empréstimo acaba e segue a regra da academy', () => {
    const r = loanPlayer(w0, youth, target(w0), 12);
    if (!r.ok) throw new Error(r.error);
    const w = { ...r.world, date: '2028-01-01', players: { ...r.world.players, [youth]: { ...r.world.players[youth], age: 20 } } };
    const out = academyYearEnd(w).world;
    expect(out.players[youth].loan).toBeFalsy();
    expect(out.teams.furia.academyIds).not.toContain(youth);
  });
});
