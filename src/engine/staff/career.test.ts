import { describe, expect, it } from 'vitest';
import { addDays } from '../date';
import { createRng } from '../rng';
import { createWorld } from '../season';
import type { World } from '../world';
import { finishCourses, monthlyStaffOffers, startCourse, staffTitle } from './career';
import { respondStaffInbox } from './market';
import { staffOvr } from './model';

const at = (w: World, date: string): World => ({ ...w, date });

describe('Carreira do staff', () => {
  it('título: +1 num atributo de cada profissional (teto 95) e títulos + 1', () => {
    const w = createWorld('furia');
    const ids = Object.values(w.teams.mouz.staff) as string[];
    const out = staffTitle(w, 'mouz', createRng(1));
    for (const id of ids) {
      const sum = (x: World) => Object.values(x.staff[id].attrs).reduce((a, b) => a + b!, 0);
      expect(sum(out) - sum(w)).toBe(1);
      expect(out.staff[id].titles).toBe(1);
    }
    const capped = { ...w, staff: { ...w.staff, [ids[0]]: { ...w.staff[ids[0]], attrs: { TAT: 95, VET: 95, GES: 95 } } } };
    expect(staffTitle(capped, 'mouz', createRng(1)).staff[ids[0]].attrs).toEqual({ TAT: 95, VET: 95, GES: 95 });
  });

  it('título do seu time: o staff pede 15% de aumento; recusar pode virar "não renova"', () => {
    const w = staffTitle(createWorld('furia'), 'furia', createRng(2));
    const asks = w.inbox.filter((i) => i.kind === 'staff_aumento');
    expect(asks).toHaveLength(3);
    const item = asks[0];
    const s = w.staff[item.staffId!];
    expect(item.askedSalary).toBe(Math.round((s.contract!.salary * 1.15) / 100) * 100);
    const yes = respondStaffInbox(w, item.id, true);
    expect(yes.ok && yes.world.staff[s.id].contract!.salary).toBe(item.askedSalary);
    let refused = 0;
    for (const it of asks) {
      const r = respondStaffInbox(w, it.id, false);
      if (r.ok && r.world.staff[it.staffId!].refusesRenewal) refused++;
    }
    expect(refused).toBeLessThanOrEqual(3);
  });

  it('curso: cobra 20.000 + (atributo − 40) × 1.500 e sobe +2 depois de 28 dias; um por vez', () => {
    const w = at(createWorld('furia'), '2027-02-01');
    const id = w.teams.furia.staff.analista!;
    const lei = w.staff[id].attrs.LEI!;
    const r = startCourse(w, id, 'LEI');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.money).toBe(w.teams.furia.money - (20000 + (lei - 40) * 1500));
    expect(startCourse(r.world, id, 'PRE').ok).toBe(false);
    expect(startCourse(r.world, id, 'TAT').ok).toBe(false);
    expect(finishCourses(at(r.world, addDays(w.date, 27))).staff[id].attrs.LEI).toBe(lei);
    const done = finishCourses(at(r.world, addDays(w.date, 28)));
    expect(done.staff[id].attrs.LEI).toBe(Math.min(95, lei + 2));
    expect(done.staff[id].course).toBeNull();
  });

  it('propostas da IA só por quem tem OVR ≥ 75; aceitar credita a multa e ele sai', () => {
    let w = at(createWorld('furia'), '2027-03-01');
    const id = w.teams.furia.staff.tecnico!;
    w = { ...w, staff: { ...w.staff, [id]: { ...w.staff[id], attrs: { TAT: 90, VET: 90, GES: 90 } } } };
    let item;
    for (let i = 0; i < 200 && !item; i++) item = monthlyStaffOffers(w, createRng(i)).world.inbox.find((x) => x.kind === 'staff_proposta' && x.staffId === id);
    expect(item).toBeTruthy();
    const from = item!.offerTeamId!;
    const withItem = { ...w, inbox: [item!] };
    const clause = w.staff[id].contract!.releaseClause;
    const r = respondStaffInbox(withItem, item!.id, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.world.teams.furia.money).toBe(w.teams.furia.money + clause);
    expect(r.world.staff[id].teamId).toBe(from);
    expect(r.world.teams[from].staff.tecnico).toBe(id);
    expect(r.world.teams.furia.staff.tecnico).toBeNull();
    // O antigo técnico do outro time fica livre, sem time fantasma.
    const old = w.teams[from].staff.tecnico!;
    expect(r.world.staff[old].teamId).toBeNull();

    const weak = { ...w, staff: { ...w.staff, [id]: { ...w.staff[id], attrs: { TAT: 60, VET: 60, GES: 60 } } } };
    expect(staffOvr(weak.staff[id])).toBeLessThan(75);
    for (let i = 0; i < 50; i++) expect(monthlyStaffOffers(weak, createRng(i)).world.inbox.some((x) => x.staffId === id)).toBe(false);
  });
});
