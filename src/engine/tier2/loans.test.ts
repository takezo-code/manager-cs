import { describe, expect, it } from 'vitest';
import { academyYearEnd } from '../academy';
import { signAmateur, visibleAmateurs } from '../amateurs';
import { payroll } from '../finance/monthly';
import { createWorld } from '../season';
import type { World } from '../world';
import { loanPlayer, loansDay, recallLoan } from './loans';
import { academyTeamId, tier2Teams } from './model';

const fict = (w: World) => Object.keys(w.tier2.teams)[0];

describe('Empréstimos', () => {
  const w0 = createWorld('furia');
  const youth = w0.teams.furia.academyIds[0];

  it('só jovem da sua academy, só para time fictício com vaga, por 3/6/12 meses', () => {
    expect(loanPlayer(w0, youth, fict(w0), 6).ok).toBe(true);
    expect(loanPlayer(w0, w0.teams.mouz.academyIds[0], fict(w0), 6).ok).toBe(false);
    expect(loanPlayer(w0, youth, academyTeamId('mouz'), 6).ok).toBe(false);
    const r = loanPlayer(w0, youth, fict(w0), 6);
    if (!r.ok) return;
    // Time com 6 + 1 emprestado = 7: cheio.
    expect(loanPlayer(r.world, w0.teams.furia.academyIds[1], fict(w0), 3).ok).toBe(false);
    expect(r.world.players[youth].loan).toMatchObject({ teamId: fict(w0), salaryShare: 0.5 });
  });

  it('folha cai pela metade do salário dele; joga pelo time do empréstimo e não pela academy', () => {
    const r = loanPlayer(w0, youth, fict(w0), 6);
    if (!r.ok) throw new Error('falhou');
    const sal = w0.players[youth].contract!.salary;
    expect(payroll(r.world, r.world.teams.furia)).toBe(payroll(w0, w0.teams.furia) - sal / 2);
    const teams = tier2Teams(r.world);
    expect(teams[fict(w0)].playerIds).toContain(youth);
    expect(teams[academyTeamId('furia')].playerIds).not.toContain(youth);
  });

  it('emprestado não ocupa vaga da academy (máximo 6 sem contar os emprestados)', () => {
    let w = w0;
    // academy cheia (6), com um deles emprestado: abre vaga para contratar na GC/FACEIT
    w = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, academyIds: [...w.teams.furia.academyIds, 'x'] } }, players: { ...w.players, x: { ...w.players[youth], id: 'x' } } };
    expect(signAmateur(w, visibleAmateurs(w)[0].player.id).ok).toBe(false);
    const r = loanPlayer(w, youth, fict(w), 3);
    if (!r.ok) throw new Error('falhou');
    expect(signAmateur(r.world, visibleAmateurs(r.world)[0].player.id).ok).toBe(true);
  });

  it('chamar de volta custa US$ 20 mil; no fim do prazo volta sozinho', () => {
    const r = loanPlayer(w0, youth, fict(w0), 3);
    if (!r.ok) throw new Error('falhou');
    const back = recallLoan(r.world, youth);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.world.players[youth].loan).toBeFalsy();
      expect(back.world.teams.furia.money).toBe(r.world.teams.furia.money - 20_000);
    }
    const later = loansDay({ ...r.world, date: '2027-03-15' });
    expect(later.world.players[youth].loan).toBeFalsy();
  });

  it('faz 20 anos emprestado: o empréstimo acaba e segue a regra da academy', () => {
    const r = loanPlayer(w0, youth, fict(w0), 12);
    if (!r.ok) throw new Error('falhou');
    const w = { ...r.world, date: '2028-01-01', players: { ...r.world.players, [youth]: { ...r.world.players[youth], age: 20 } } };
    const out = academyYearEnd(w).world;
    expect(out.players[youth].loan).toBeFalsy();
    expect(out.teams.furia.academyIds).not.toContain(youth);
  });
});
