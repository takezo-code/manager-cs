import { describe, expect, it } from 'vitest';
import { payroll } from '../finance/monthly';
import { createWorld } from '../season';
import { STAFF_ROLES, staffAttr, staffOvr, staffSalary, teamStaff } from './model';

describe('Comissão técnica: modelo e dados', () => {
  const w = createWorld('furia');

  it('os 32 times começam com técnico, analista e psicólogo', () => {
    expect(Object.keys(w.teams)).toHaveLength(32);
    for (const t of Object.values(w.teams))
      for (const role of STAFF_ROLES) {
        const s = teamStaff(w, t.id, role)!;
        expect(s.role).toBe(role);
        expect(s.teamId).toBe(t.id);
        expect(s.contract?.teamId).toBe(t.id);
      }
  });

  it('técnicos reais: sidde na FURIA, zonic na Falcons', () => {
    expect(teamStaff(w, 'furia', 'tecnico')!.nick).toBe('sidde');
    expect(teamStaff(w, 'falcons', 'tecnico')!.nick).toBe('zonic');
  });

  it('há 12 profissionais livres por cargo', () => {
    for (const role of STAFF_ROLES)
      expect(Object.values(w.staff).filter((s) => s.role === role && !s.teamId)).toHaveLength(12);
  });

  it('atributos entre 40 e 95, OVR é a média', () => {
    for (const s of Object.values(w.staff))
      for (const v of Object.values(s.attrs)) {
        expect(v).toBeGreaterThanOrEqual(40);
        expect(v).toBeLessThanOrEqual(95);
      }
    expect(staffOvr({ ...teamStaff(w, 'furia', 'analista')!, attrs: { LEI: 70, PRE: 81 } })).toBe(76);
  });

  it('salário pelo OVR: 1000 + (OVR − 40)² × 6', () => {
    expect(staffSalary(60)).toBe(3400);
    expect(staffSalary(85)).toBe(13200);
  });

  it('cargo vago conta como 50', () => {
    const vago = { ...w, teams: { ...w.teams, furia: { ...w.teams.furia, staff: { ...w.teams.furia.staff, tecnico: null } } } };
    expect(staffAttr(vago, 'furia', 'TAT')).toBe(50);
    expect(staffAttr(w, 'furia', 'TAT')).toBe(teamStaff(w, 'furia', 'tecnico')!.attrs.TAT);
  });

  it('a folha inclui o salário do staff', () => {
    const t = w.teams.furia;
    const semStaff = payroll(w, { ...t, staff: { tecnico: null, analista: null, psicologo: null } });
    const staffPay = STAFF_ROLES.reduce((s, r) => s + teamStaff(w, 'furia', r)!.contract!.salary, 0);
    expect(payroll(w, t)).toBe(semStaff + staffPay);
  });
});
