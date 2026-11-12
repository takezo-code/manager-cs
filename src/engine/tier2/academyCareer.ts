// Carreira começando como manager da academy: metas próprias, recomendação de promoção e o caminho até o time principal.
import { promote } from '../academy';
import { MANAGER } from '../config';
import { daysBetween } from '../date';
import { baseOvr } from '../form';
import { gainConfidence, gainReputation, type Goal } from '../manager/model';
import { makeProposal } from '../manager/offers';
import { playerOvr } from '../player';
import { weakestRole } from '../squad';
import type { World, WorldEvent } from '../world';
import { academyRanking } from './ranking';
import { academyTeamId } from './model';

export const ACADEMY_GOALS: Goal[] = [
  { kind: 'tier2_top8', text: 'Terminar no top 8 das academies no tier 3' },
  { kind: 'promover_jovem', text: 'Promover ao menos 1 jovem ao time principal' },
  { kind: 'jovem_cresce5', text: 'Um jovem crescer +5 de OVR na temporada' },
];

const snapshot = (w: World, orgId: string) =>
  Object.fromEntries((w.teams[orgId]?.academyIds ?? []).filter((id) => w.players[id]).map((id) => [id, baseOvr(w.players[id])]));

/** Metas novas da academy (mesma regra de prazo do time principal: depois de outubro, fim do ano seguinte). */
export function assignAcademyGoals(w: World, orgId: string): World {
  const year = Number(w.date.slice(0, 4));
  const month = Number(w.date.slice(5, 7));
  return {
    ...w,
    manager: {
      ...w.manager,
      goals: ACADEMY_GOALS,
      clubSize: 'pequeno',
      goalsSeason: month > MANAGER.lateStartMonth ? year + 1 : year,
      academyStats: { promoted: 0, startOvr: snapshot(w, orgId) },
    },
  };
}

/** Começa a carreira cuidando só da academy da organização (o time principal fica com a IA). */
export function startAsAcademyManager(w: World, orgId: string): World {
  const m = w.manager;
  const next: World = {
    ...w,
    managerTeamId: '',
    manager: { ...m, academyOf: orgId, stints: [{ teamId: orgId, from: w.date, to: null, reason: null, academy: true }] },
  };
  return assignAcademyGoals(next, orgId);
}

/** Recomenda um jovem ao time principal: aceito se houver vaga e ele for quase tão bom quanto o pior titular. */
export function recommendPromotion(w: World, playerId: string): { ok: true; world: World } | { ok: false; error: string } {
  const org = w.manager.academyOf;
  const p = w.players[playerId];
  if (!org || p?.teamId !== org || p.squad !== 'academy') return { ok: false, error: 'Esse jovem não é da sua academy.' };
  const team = w.teams[org];
  if (team.playerIds.length >= 5 && playerOvr(p) < weakestRole(team, w.players).ovr - MANAGER.promoteMargin)
    return { ok: false, error: `A diretoria do time principal achou cedo demais para ${p.nick}.` };
  const r = promote(w, playerId);
  if (!r.ok) return r;
  const stats = r.world.manager.academyStats ?? { promoted: 0, startOvr: {} };
  return { ok: true, world: { ...r.world, manager: { ...r.world.manager, academyStats: { ...stats, promoted: stats.promoted + 1 } } } };
}

/** Dia 1º: jovens que estão na academy da sua organização ficam marcados como revelados por você. */
export function markRevealed(w: World): World {
  const org = w.managerTeamId || w.manager?.academyOf;
  if (!org) return w;
  const players = { ...w.players };
  let changed = false;
  for (const id of w.teams[org]?.academyIds ?? []) {
    const p = players[id];
    // Só quem já está há pelo menos 1 mês na academy (saves antigos: sem data, conta como antigo).
    if (p && !p.revealed && (!p.academySince || daysBetween(p.academySince, w.date) >= MANAGER.revealedDays)) {
      players[id] = { ...p, revealed: true };
      changed = true;
    }
  }
  return changed ? { ...w, players } : w;
}

/** Fecha a passagem pela academy. */
export function leaveAcademy(w: World, reason: string): World {
  const m = w.manager;
  const stints = m.stints.map((s, i) => (i === m.stints.length - 1 && s.academy && s.to === null ? { ...s, to: w.date, reason } : s));
  return { ...w, manager: { ...m, stints, academyOf: null, goals: [] } };
}

/** Virada do ano do manager da academy: metas, confiança, promoção ao time principal ou demissão. */
export function academySeasonEnd(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const org = w.manager.academyOf;
  if (!org) return { world: w, events: [] };
  const year = Number(w.date.slice(0, 4)) - 1;
  if (w.manager.goalsSeason > year) return { world: w, events: [] };
  const stats = w.manager.academyStats ?? { promoted: 0, startOvr: {} };
  const pos = academyRanking(w, year).findIndex((r) => r.teamId === academyTeamId(org) && r.points > 0) + 1;
  const met: Record<string, boolean> = {
    tier2_top8: pos > 0 && pos <= 8,
    promover_jovem: stats.promoted >= 1,
    jovem_cresce5: Object.entries(stats.startOvr).some(([id, ovr]) => w.players[id] && baseOvr(w.players[id]) - ovr >= MANAGER.academyGrowthGoal),
  };
  let count = 0;
  for (const g of w.manager.goals) {
    if (met[g.kind]) {
      count++;
      w = { ...w, manager: gainReputation(gainConfidence(w.manager, MANAGER.goalMetConfidence), MANAGER.repGoalMet) };
    } else {
      w = { ...w, manager: gainReputation(gainConfidence(w.manager, -MANAGER.goalFailedConfidence.pequeno), MANAGER.repGoalFailed) };
    }
  }
  const team = w.teams[org];
  const events: WorldEvent[] = [{ kind: count === w.manager.goals.length ? 'ok' : 'info', text: `Academy: ${count} de ${w.manager.goals.length} metas batidas em ${year}.` }];
  if (w.manager.confidence < MANAGER.fireBelow) {
    w = leaveAcademy(w, 'demitido');
    w = { ...w, manager: gainReputation(w.manager, MANAGER.repFired) };
    events.push({ kind: 'alerta', text: `A ${team.name} tirou você da academy. Agora está livre, esperando propostas.` });
    return { world: w, events };
  }
  if (count === w.manager.goals.length) {
    w = makeProposal(w, org);
    events.push({ kind: 'ok', text: `A diretoria da ${team.name} quer você no comando do time principal.` });
  }
  return { world: assignAcademyGoals(w, org), events };
}
