// Empréstimo de jovens da sua academy para times reais do tier 2/3 (fora do top 32).
import { TIER2 } from '../config';
import { endOfMonthAfter } from '../date';
import { fmtMoney } from '../format';
import { addMoney, type World, type WorldEvent } from '../world';
import { managerOrg } from '../manager/model';

export type LoanResult = { ok: true; world: World } | { ok: false; error: string };
export const LOAN_MONTHS = [3, 6, 12] as const;

/** Jovens da organização emprestados agora. */
export const loanedOut = (w: World, orgId: string) => (w.teams[orgId]?.academyIds ?? []).filter((id) => w.players[id]?.loan);

/** Emprestados a um time agora. */
export const loanedTo = (w: World, teamId: string) => Object.values(w.players).filter((p) => p.loan?.teamId === teamId).map((p) => p.id);

/** Times que aceitam empréstimo: reais, fora do top 32, com vaga (elenco + emprestados abaixo de 7). */
export const loanTargets = (w: World) =>
  Object.values(w.teams)
    .filter((t) => t.hltvRank > TIER2.academies && t.id !== managerOrg(w) && t.playerIds.length + loanedTo(w, t.id).length < TIER2.loanRosterMax)
    .sort((a, b) => a.hltvRank - b.hltvRank);

export function loanPlayer(w: World, playerId: string, toTeamId: string, months: number): LoanResult {
  const org = managerOrg(w);
  const p = w.players[playerId];
  if (!org || !p || p.teamId !== org || p.squad !== 'academy') return { ok: false, error: 'Só dá para emprestar jovens da sua academy.' };
  if (p.loan) return { ok: false, error: `${p.nick} já está emprestado.` };
  const team = w.teams[toTeamId];
  if (!team || team.id === org) return { ok: false, error: 'Empréstimo só para outro time do ranking.' };
  if (team.hltvRank <= TIER2.academies) return { ok: false, error: `Empréstimo só para times fora do top ${TIER2.academies}.` };
  if (!(LOAN_MONTHS as readonly number[]).includes(months)) return { ok: false, error: 'Prazo inválido: 3, 6 ou 12 meses.' };
  if (team.playerIds.length + loanedTo(w, toTeamId).length >= TIER2.loanRosterMax) return { ok: false, error: `${team.name} já está com o elenco cheio.` };
  const loan = { teamId: toTeamId, until: endOfMonthAfter(w.date, months), salaryShare: TIER2.loanSalaryShare };
  return { ok: true, world: { ...w, players: { ...w.players, [playerId]: { ...p, loan } } } };
}

export function recallLoan(w: World, playerId: string): LoanResult {
  const org = managerOrg(w);
  const p = w.players[playerId];
  if (!org || !p?.loan || p.teamId !== org) return { ok: false, error: 'Esse jovem não está emprestado.' };
  if (w.teams[org].money < TIER2.recallFee) return { ok: false, error: `Caixa insuficiente: chamar de volta custa ${fmtMoney(TIER2.recallFee)}.` };
  const next = addMoney(w, org, -TIER2.recallFee, 'contratacao', `Volta do empréstimo de ${p.nick}`);
  return { ok: true, world: { ...next, players: { ...next.players, [playerId]: { ...p, loan: null } } } };
}

/** Empréstimos que acabaram voltam sozinhos. */
export function loansDay(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const org = managerOrg(w);
  for (const p of Object.values(w.players)) {
    if (!p.loan || p.loan.until >= w.date) continue;
    w = { ...w, players: { ...w.players, [p.id]: { ...p, loan: null } } };
    if (p.teamId === org) events.push({ kind: 'info', text: `${p.nick} voltou do empréstimo à ${w.teams[p.loan.teamId]?.name ?? 'equipe'}.` });
  }
  return { world: w, events };
}
