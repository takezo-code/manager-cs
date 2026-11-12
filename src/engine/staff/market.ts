// Mercado e contratos da comissão técnica: contratar, dispensar, renovar e a IA preenchendo vagas.
import { windowOpen } from '../calendar';
import { STAFF } from '../config';
import { addDays, daysBetween, endOfMonthAfter, monthsUntil } from '../date';
import { hashString } from '../rng';
import { fmtMoney } from '../format';
import type { Rng } from '../rng';
import type { Staff, StaffRole } from '../types';
import { addMoney, type InboxItem, type World, type WorldEvent } from '../world';
import { staffOvr, staffSalary } from './model';

export type StaffResult = { ok: true; world: World } | { ok: false; error: string };

export const ROLE_LABEL: Record<StaffRole, string> = { tecnico: 'técnico', analista: 'analista', psicologo: 'psicólogo' };

const round100 = (v: number) => Math.round(v / 100) * 100;

/** Salário que o profissional pede para vir (empregado pede +15%). */
export const staffAsk = (s: Staff) => round100(staffSalary(staffOvr(s)) * (s.teamId ? 1 + STAFF.poachRaise : 1));

const newContract = (w: World, teamId: string, salary: number) => ({
  teamId,
  salary,
  endDate: endOfMonthAfter(w.date, STAFF.contractMonths),
  releaseClause: salary * STAFF.clauseMonths,
});

function setRole(w: World, teamId: string, role: StaffRole, id: string | null): World {
  const t = w.teams[teamId];
  return { ...w, teams: { ...w.teams, [teamId]: { ...t, staff: { ...t.staff, [role]: id } } } };
}

/** Deixa o profissional livre e o cargo do time vago. */
export function freeStaff(w: World, staffId: string): World {
  const s = w.staff[staffId];
  let next = s.teamId && w.teams[s.teamId]?.staff[s.role] === staffId ? setRole(w, s.teamId, s.role, null) : w;
  next = { ...next, staff: { ...next.staff, [staffId]: { ...s, teamId: null, contract: null, refusesRenewal: false } } };
  return next;
}

/** Coloca o profissional no time, com contrato novo. */
function sign(w: World, staffId: string, teamId: string, salary: number): World {
  let next = freeStaff(w, staffId);
  // Quem ocupava o cargo no time de destino fica livre.
  const holder = next.teams[teamId].staff[next.staff[staffId].role];
  if (holder && holder !== staffId) next = freeStaff(next, holder);
  const s = next.staff[staffId];
  next = setRole(next, teamId, s.role, staffId);
  return { ...next, staff: { ...next.staff, [staffId]: { ...s, teamId, contract: newContract(w, teamId, salary) } } };
}

export function hireStaff(w: World, staffId: string): StaffResult {
  const s = w.staff[staffId];
  const me = w.managerTeamId;
  const t = w.teams[me];
  if (!s) return { ok: false, error: 'Esse profissional não existe.' };
  if (s.teamId === me) return { ok: false, error: `${s.nick} já trabalha no seu time.` };
  if (t.staff[s.role]) return { ok: false, error: `Você já tem um ${ROLE_LABEL[s.role]}. Dispense o atual antes de contratar outro.` };
  const salary = staffAsk(s);
  if (!s.teamId) return { ok: true, world: sign(w, staffId, me, salary) };
  if (!windowOpen(w.date))
    return { ok: false, error: 'Mercado fechado: fora da janela (1–20 jan e 22 jun–10 ago) só dá para contratar profissionais livres.' };
  const clause = s.contract?.releaseClause ?? 0;
  if (t.money < clause) return { ok: false, error: `Caixa insuficiente para pagar a multa de ${fmtMoney(clause)}.` };
  const from = s.teamId;
  let next = addMoney(w, me, -clause, 'comissao', `Multa de ${s.nick} (${w.teams[from].shortName})`);
  next = addMoney(next, from, clause, 'comissao', `Multa de ${s.nick}`);
  return { ok: true, world: sign(next, staffId, me, salary) };
}

/** Rescisão: paga metade do que falta do contrato. */
export const releaseCost = (w: World, s: Staff) =>
  s.contract ? round100(Math.max(0, monthsUntil(w.date, s.contract.endDate)) * s.contract.salary * STAFF.releaseShare) : 0;

export function releaseStaff(w: World, staffId: string): StaffResult {
  const s = w.staff[staffId];
  const me = w.managerTeamId;
  if (!s || s.teamId !== me) return { ok: false, error: 'Esse profissional não é do seu time.' };
  const cost = releaseCost(w, s);
  if (w.teams[me].money < cost) return { ok: false, error: `Caixa insuficiente: a rescisão custa ${fmtMoney(cost)}.` };
  return { ok: true, world: freeStaff(addMoney(w, me, -cost, 'comissao', `Rescisão de ${s.nick}`), staffId) };
}

function inboxItem(w: World, kind: InboxItem['kind'], staffId: string, extra: Partial<InboxItem> = {}): InboxItem {
  return { id: `${kind}:${staffId}:${w.date}`, kind, playerId: '', staffId, date: w.date, expires: addDays(w.date, STAFF.inboxDays), ...extra };
}

/** Resposta do manager a um item de staff da caixa de entrada. */
export function respondStaffInbox(w: World, itemId: string, accept: boolean): StaffResult {
  const item = w.inbox.find((i) => i.id === itemId);
  if (!item?.staffId) return { ok: false, error: 'Esse aviso não existe mais.' };
  const s = w.staff[item.staffId];
  let next: World = { ...w, inbox: w.inbox.filter((i) => i.id !== itemId) };
  if (item.kind === 'staff_renovacao' && accept && s.contract && s.teamId) {
    const salary = item.askedSalary ?? s.contract.salary;
    next = { ...next, staff: { ...next.staff, [s.id]: { ...s, contract: { ...s.contract, salary, releaseClause: salary * STAFF.clauseMonths, endDate: endOfMonthAfter(s.contract.endDate, STAFF.contractMonths) } } } };
  }
  if (item.kind === 'staff_aumento' && s.contract) {
    if (accept) {
      const salary = item.askedSalary ?? s.contract.salary;
      next = { ...next, staff: { ...next.staff, [s.id]: { ...s, contract: { ...s.contract, salary } } } };
    } else if ((hashString(item.id) % 1000) / 1000 < STAFF.refuseRenewalChance) {
      next = { ...next, staff: { ...next.staff, [s.id]: { ...s, refusesRenewal: true } } };
    }
  }
  if (item.kind === 'staff_proposta' && accept && s.contract && s.teamId && item.offerTeamId) {
    const to = item.offerTeamId;
    const clause = s.contract.releaseClause;
    if (next.teams[to].money < clause) return { ok: false, error: `${next.teams[to].shortName} não tem mais caixa para pagar a multa.` };
    next = addMoney(next, to, -clause, 'comissao', `Multa de ${s.nick}`);
    next = addMoney(next, s.teamId, clause, 'comissao', `Saída de ${s.nick} (${next.teams[to].shortName})`);
    next = sign(next, s.id, to, staffAsk(s));
  }
  return { ok: true, world: next };
}

/** Itens de staff sem resposta contam como recusa. */
export function expireStaffInbox(w: World): World {
  let next = w;
  for (const item of w.inbox.filter((i) => i.staffId && i.expires < w.date)) {
    const r = respondStaffInbox(next, item.id, false);
    if (r.ok) next = r.world;
  }
  return next;
}

/** Um dia do mercado da comissão: avisos de renovação, fim de contrato, renovação e vagas da IA. */
export function staffMarketDay(world: World, _rng: Rng): { world: World; events: WorldEvent[] } {
  let w = expireStaffInbox(world);
  const events: WorldEvent[] = [];
  const me = w.managerTeamId;
  for (const s of Object.values(w.staff)) {
    if (!s.teamId || !s.contract) continue;
    const left = daysBetween(w.date, s.contract.endDate);
    if (left < 0) {
      w = freeStaff(w, s.id);
      if (s.teamId === me) events.push({ kind: 'alerta', text: `O contrato de ${s.nick} (${ROLE_LABEL[s.role]}) acabou e ele saiu.` });
      continue;
    }
    if (s.teamId === me) {
      if (left === STAFF.renewNoticeDays) {
        if (s.refusesRenewal) events.push({ kind: 'alerta', text: `${s.nick} avisou que não vai renovar: sai em ${STAFF.renewNoticeDays} dias.` });
        else w = { ...w, inbox: [inboxItem(w, 'staff_renovacao', s.id, { askedSalary: staffSalary(staffOvr(s)), expires: addDays(w.date, STAFF.renewDays) }), ...w.inbox] };
      }
    } else if (left <= STAFF.aiRenewDays) {
      const salary = staffSalary(staffOvr(s));
      w = { ...w, staff: { ...w.staff, [s.id]: { ...s, contract: { ...s.contract, salary, releaseClause: salary * STAFF.clauseMonths, endDate: endOfMonthAfter(s.contract.endDate, STAFF.contractMonths) } } } };
    }
  }
  // IA com cargo vago: contrata o melhor livre que cabe no caixa.
  for (const t of Object.values(w.teams)) {
    if (t.id === me) continue;
    for (const role of ['tecnico', 'analista', 'psicologo'] as const) {
      if (w.teams[t.id].staff[role]) continue;
      const free = Object.values(w.staff).filter((s) => s.role === role && !s.teamId);
      // O melhor que cabe no caixa; sem caixa, o mais barato (cargo vago custa mais caro em campo).
      const pick =
        free.filter((s) => w.teams[t.id].money >= staffAsk(s) * STAFF.aiAffordMonths).sort((a, b) => staffOvr(b) - staffOvr(a))[0] ??
        [...free].sort((a, b) => staffAsk(a) - staffAsk(b))[0];
      if (pick) w = sign(w, pick.id, t.id, staffAsk(pick));
    }
  }
  return { world: w, events };
}
