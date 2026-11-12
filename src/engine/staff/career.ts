// Carreira da comissão técnica: experiência com títulos, cursos, pedidos de aumento e propostas da IA.
import { STAFF } from '../config';
import { addDays } from '../date';
import { fmtMoney } from '../format';
import type { Rng } from '../rng';
import type { StaffAttr } from '../types';
import { addMoney, type World, type WorldEvent } from '../world';
import { inboxItem, round100, STAFF_ROLE_LABEL, type StaffResult } from './market';
import { STAFF_ATTRS, STAFF_ROLES, staffOvr } from './model';

const cap = (v: number) => Math.min(STAFF.maxAttr, v);

/** Título: +1 num atributo aleatório de cada profissional do campeão. O seu staff pede aumento. */
export function staffTitle(world: World, teamId: string, rng: Rng): World {
  let w = world;
  for (const role of STAFF_ROLES) {
    const id = w.teams[teamId]?.staff[role];
    if (!id) continue;
    const s = w.staff[id];
    const open = STAFF_ATTRS[role].filter((k) => (s.attrs[k] ?? 0) < STAFF.maxAttr);
    const attrs = { ...s.attrs };
    if (open.length) {
      const k = rng.pick(open);
      attrs[k] = cap((attrs[k] ?? STAFF.vacantAttr) + 1);
    }
    w = { ...w, staff: { ...w.staff, [id]: { ...s, attrs, titles: s.titles + 1 } } };
    if (teamId === w.managerTeamId && s.contract)
      w = { ...w, inbox: [inboxItem(w, 'staff_aumento', id, { askedSalary: round100(s.contract.salary * (1 + STAFF.raiseAfterTitle)) }), ...w.inbox] };
  }
  return w;
}

export const courseCost = (value: number) => STAFF.courseBase + (value - STAFF.minAttr) * STAFF.coursePerPoint;

export function startCourse(w: World, staffId: string, attr: StaffAttr): StaffResult {
  const s = w.staff[staffId];
  const me = w.managerTeamId;
  if (!s || s.teamId !== me) return { ok: false, error: 'Esse profissional não é do seu time.' };
  if (!STAFF_ATTRS[s.role].includes(attr)) return { ok: false, error: `Esse curso não serve para um ${STAFF_ROLE_LABEL[s.role]}.` };
  if (s.course) return { ok: false, error: `${s.nick} já está fazendo um curso.` };
  const value = s.attrs[attr] ?? STAFF.vacantAttr;
  if (value >= STAFF.maxAttr) return { ok: false, error: 'Esse atributo já está no máximo (95).' };
  const cost = courseCost(value);
  if (w.teams[me].money < cost) return { ok: false, error: `Caixa insuficiente: o curso custa ${fmtMoney(cost)}.` };
  const next = addMoney(w, me, -cost, 'comissao', `Curso de ${s.nick}`);
  return { ok: true, world: { ...next, staff: { ...next.staff, [staffId]: { ...s, course: { attr, until: addDays(w.date, STAFF.courseDays) } } } } };
}

/** Cursos que terminam hoje: o atributo sobe. Vale mesmo se ele trocou de time. */
export function finishCourses(world: World): World {
  let w = world;
  for (const s of Object.values(w.staff)) {
    if (!s.course || s.course.until > w.date) continue;
    const k = s.course.attr;
    w = { ...w, staff: { ...w.staff, [s.id]: { ...s, course: null, attrs: { ...s.attrs, [k]: cap((s.attrs[k] ?? STAFF.vacantAttr) + STAFF.courseGain) } } } };
  }
  return w;
}

/** Dia 1º: a IA tenta levar quem do seu staff tem OVR alto. */
export function monthlyStaffOffers(world: World, rng: Rng): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const me = w.managerTeamId;
  for (const role of STAFF_ROLES) {
    const id = w.teams[me]?.staff[role];
    if (!id) continue;
    const s = w.staff[id];
    if (!s.contract || staffOvr(s) < STAFF.offerMinOvr || !rng.chance(STAFF.offerChance)) continue;
    if (w.inbox.some((i) => i.staffId === id && i.kind === 'staff_proposta')) continue;
    const buyers = Object.values(w.teams).filter((t) => {
      if (t.id === me || t.money < s.contract!.releaseClause * 2) return false;
      const cur = t.staff[role] ? w.staff[t.staff[role]!] : null;
      return !cur || staffOvr(cur) < staffOvr(s);
    });
    if (!buyers.length) continue;
    const buyer = rng.pick(buyers);
    w = { ...w, inbox: [inboxItem(w, 'staff_proposta', id, { offerTeamId: buyer.id }), ...w.inbox] };
    events.push({ kind: 'alerta', text: `${buyer.shortName} quer contratar ${s.nick} (${STAFF_ROLE_LABEL[role]}) pagando a multa.` });
  }
  return { world: w, events };
}
