import { describe, expect, it } from 'vitest';
import { addDays } from '../date';
import { createWorld } from '../season';
import type { World } from '../world';
import { hireStaff, releaseStaff, respondStaffInbox, staffMarketDay } from './market';
import { staffOvr, staffSalary } from './model';

const at = (w: World, date: string): World => ({ ...w, date });
const free = (w: World, role: 'tecnico' | 'analista' | 'psicologo') =>
  Object.values(w.staff).filter((s) => s.role === role && !s.teamId).sort((a, b) => staffOvr(b) - staffOvr(a))[0];
const vacate = (w: World, role: 'tecnico' | 'analista' | 'psicologo'): World => {
  const id = w.teams.furia.staff[role]!;
  return {
    ...w,
    teams: { ...w.teams, furia: { ...w.teams.furia, staff: { ...w.teams.furia.staff, [role]: null } } },
    staff: { ...w.staff, [id]: { ...w.staff[id], teamId: null, contract: null } },
  };
};

describe('Mercado da comissão técnica', () => {
  it('contrata um livre a qualquer data, pelo salário pedido', () => {
    const w = vacate(at(createWorld('furia'), '2027-03-10'), 'analista');
    const s = free(w, 'analista');
    const r = hireStaff(w, s.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.staff.analista).toBe(s.id);
    expect(r.world.staff[s.id].contract!.salary).toBe(staffSalary(staffOvr(s)));
    expect(r.world.staff[s.id].contract!.releaseClause).toBe(staffSalary(staffOvr(s)) * 12);
  });

  it('cargo ocupado: precisa dispensar antes', () => {
    const w = createWorld('furia');
    const r = hireStaff(w, free(w, 'analista').id);
    expect(r.ok).toBe(false);
  });

  it('empregado: só na janela, pagando a multa e +15% de salário', () => {
    let w = vacate(createWorld('furia'), 'tecnico');
    const target = w.staff[w.teams.mouz.staff.tecnico!];
    expect(hireStaff(at(w, '2027-03-10'), target.id).ok).toBe(false);
    w = at(w, '2027-01-05');
    const money = w.teams.furia.money;
    const mouzMoney = w.teams.mouz.money;
    const r = hireStaff(w, target.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.money).toBe(money - target.contract!.releaseClause);
    expect(r.world.teams.mouz.money).toBe(mouzMoney + target.contract!.releaseClause);
    expect(r.world.teams.mouz.staff.tecnico).toBeNull();
    expect(r.world.staff[target.id].contract!.salary).toBe(Math.round((staffSalary(staffOvr(target)) * 1.15) / 100) * 100);
  });

  it('dispensar paga metade do que falta; sem caixa, erro e nada muda', () => {
    const w = at(createWorld('furia'), '2026-12-01');
    const s = w.staff[w.teams.furia.staff.psicologo!];
    const r = releaseStaff(w, s.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.staff.psicologo).toBeNull();
    expect(r.world.staff[s.id].teamId).toBeNull();
    expect(r.world.teams.furia.money).toBeLessThan(w.teams.furia.money);
    const broke = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, money: 0 } } };
    const r2 = releaseStaff(broke, s.id);
    expect(r2.ok).toBe(false);
  });

  it('renovação: aviso 60 dias antes; aceitar estende, recusar deixa sair no fim', () => {
    let w = createWorld('furia');
    const id = w.teams.furia.staff.tecnico!;
    const end = '2027-06-30';
    w = { ...w, staff: { ...w.staff, [id]: { ...w.staff[id], contract: { ...w.staff[id].contract!, endDate: end } } } };
    w = staffMarketDay(at(w, addDays(end, -60))).world;
    const item = w.inbox.find((i) => i.kind === 'staff_renovacao' && i.staffId === id)!;
    expect(item).toBeTruthy();
    const yes = respondStaffInbox(w, item.id, true);
    expect(yes.ok).toBe(true);
    if (yes.ok) expect(yes.world.staff[id].contract!.endDate > end).toBe(true);
    const no = respondStaffInbox(w, item.id, false);
    expect(no.ok).toBe(true);
    if (!no.ok) return;
    const after = staffMarketDay(at(no.world, addDays(end, 1))).world;
    expect(after.staff[id].teamId).toBeNull();
    expect(after.teams.furia.staff.tecnico).toBeNull();
  });

  it('IA: renova sozinha e preenche cargo vago com o melhor livre que cabe no caixa', () => {
    let w = createWorld('furia');
    const id = w.teams.mouz.staff.analista!;
    w = {
      ...w,
      teams: { ...w.teams, mouz: { ...w.teams.mouz, staff: { ...w.teams.mouz.staff, psicologo: null } } },
      staff: { ...w.staff, [w.teams.mouz.staff.psicologo!]: { ...w.staff[w.teams.mouz.staff.psicologo!], teamId: null, contract: null }, [id]: { ...w.staff[id], contract: { ...w.staff[id].contract!, endDate: '2027-01-31' } } },
    };
    const best = free(w, 'psicologo');
    const out = staffMarketDay(at(w, '2027-01-10')).world;
    expect(out.staff[id].contract!.endDate > '2027-01-31').toBe(true);
    expect(out.teams.mouz.staff.psicologo).toBe(best.id);
  });
});
