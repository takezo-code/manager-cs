// Comissão técnica: técnico, analista e psicólogo. Cargo vago conta como atributo 50.
import { STAFF } from '../config';
import type { Staff, StaffAttr, StaffRole } from '../types';
import type { World } from '../world';

export const STAFF_ROLES = ['tecnico', 'analista', 'psicologo'] as const satisfies readonly StaffRole[];

export const STAFF_ATTRS: Record<StaffRole, readonly StaffAttr[]> = {
  tecnico: ['TAT', 'VET', 'GES'],
  analista: ['LEI', 'PRE'],
  psicologo: ['PRS', 'MOT'],
};

/** Cargo de cada atributo. */
export const ROLE_OF_ATTR: Record<StaffAttr, StaffRole> = { TAT: 'tecnico', VET: 'tecnico', GES: 'tecnico', LEI: 'analista', PRE: 'analista', PRS: 'psicologo', MOT: 'psicologo' };

export function staffOvr(s: Staff): number {
  const vals = STAFF_ATTRS[s.role].map((k) => s.attrs[k] ?? STAFF.vacantAttr);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Salário mensal pedido para um OVR. */
export const staffSalary = (ovr: number) => Math.round((STAFF.salaryBase + (ovr - 40) ** 2 * STAFF.salaryFactor) / 100) * 100;

export function teamStaff(w: World, teamId: string, role: StaffRole): Staff | null {
  const id = w.teams[teamId]?.staff?.[role];
  return id ? (w.staff[id] ?? null) : null;
}

/** Atributo efetivo do staff do time (50 se o cargo estiver vago). */
export function staffAttr(w: World, teamId: string, attr: StaffAttr): number {
  return teamStaff(w, teamId, ROLE_OF_ATTR[attr])?.attrs[attr] ?? STAFF.vacantAttr;
}
