// Diretoria: metas da temporada por tamanho do clube, avaliação em 31/12, aporte, confiança e demissão.
import { MANAGER } from '../config';
import { placeNumber } from '../finance/prizes';
import type { Team } from '../types';
import { addMoney, type World, type WorldEvent } from '../world';
import { gainConfidence, gainReputation, type Goal, type GoalKind } from './model';

export type ClubSize = 'grande' | 'medio' | 'pequeno';

export const CLUB_SIZE_LABEL: Record<ClubSize, string> = { grande: 'grande', medio: 'médio', pequeno: 'pequeno' };

export function clubSize(team: Team): ClubSize {
  if (team.hltvRank <= MANAGER.bigClubRank) return 'grande';
  if (team.hltvRank <= MANAGER.midClubRank) return 'medio';
  return 'pequeno';
}

const GOAL_TEXT: Record<GoalKind, string> = {
  titulo: 'Vencer ao menos 1 evento',
  top5: 'Terminar no top 5 do ranking',
  top10: 'Terminar no top 10 do ranking',
  top20: 'Terminar no top 20 do ranking',
  major_top8: 'Chegar ao top 8 de um Major',
  jogar_major: 'Jogar um Major',
  caixa: 'Terminar com caixa positivo',
};

const GOALS_BY_SIZE: Record<ClubSize, GoalKind[]> = {
  grande: ['titulo', 'top5', 'caixa'],
  medio: ['top10', 'major_top8', 'caixa'],
  pequeno: ['jogar_major', 'top20', 'caixa'],
};

export const seasonGoals = (team: Team): Goal[] => GOALS_BY_SIZE[clubSize(team)].map((kind) => ({ kind, text: GOAL_TEXT[kind] }));

/** Metas novas para o time; assumindo depois de outubro, a avaliação é no fim do ano seguinte. */
export function assignGoals(w: World, teamId: string): World {
  const team = w.teams[teamId];
  const year = Number(w.date.slice(0, 4));
  const month = Number(w.date.slice(5, 7));
  return {
    ...w,
    manager: { ...w.manager, goals: seasonGoals(team), clubSize: clubSize(team), goalsSeason: month > MANAGER.lateStartMonth ? year + 1 : year },
  };
}

/** A meta foi batida na temporada `year`? */
function goalMet(w: World, teamId: string, kind: GoalKind, year: number): boolean {
  const team = w.teams[teamId];
  const majors = w.calendar.filter((e) => e.format === 'major32' && e.startDate.startsWith(String(year)) && e.tournament);
  switch (kind) {
    case 'titulo':
      return w.manager.titles.some((t) => t.teamId === teamId && t.date.startsWith(String(year)));
    case 'top5':
      return team.hltvRank <= 5;
    case 'top10':
      return team.hltvRank <= 10;
    case 'top20':
      return team.hltvRank <= 20;
    case 'major_top8':
      return majors.some((e) => {
        const label = e.tournament!.placements[teamId];
        return !!label && placeNumber(label) <= 8;
      });
    case 'jogar_major':
      return majors.some((e) => e.tournament!.participants.includes(teamId));
    case 'caixa':
      return team.money > 0;
    default:
      return false;
  }
}

/** Sai do time (demissão, pedido de demissão ou proposta aceita): fecha a passagem e limpa o que era do time. */
export function leaveTeam(w: World, reason: string): World {
  const m = w.manager;
  const stints = m.stints.map((s, i) => (i === m.stints.length - 1 && s.to === null ? { ...s, to: w.date, reason } : s));
  return {
    ...w,
    managerTeamId: '',
    manager: { ...m, stints, goals: [] },
    inbox: w.inbox.filter((i) => i.kind === 'manager_proposta'),
    offers: [],
    sponsorOffers: [],
  };
}

/** Demissão pela diretoria. */
export function fire(w: World): World {
  const out = leaveTeam(w, 'demitido');
  return { ...out, manager: gainReputation(out.manager, MANAGER.repFired) };
}

/** Virada do ano: avalia as metas da temporada que acabou, aplica aporte/confiança e talvez demite. */
export function evaluateSeason(world: World): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const me = w.managerTeamId;
  if (!me) return { world: w, events };
  const year = Number(w.date.slice(0, 4)) - 1;
  if (w.manager.goalsSeason > year) return { world: w, events };
  const size = w.manager.clubSize;
  let met = 0;
  for (const g of w.manager.goals) {
    if (goalMet(w, me, g.kind, year)) {
      met++;
      w = { ...w, manager: gainReputation(gainConfidence(w.manager, MANAGER.goalMetConfidence), MANAGER.repGoalMet) };
      w = addMoney(w, me, MANAGER.boardInjection[size], 'diretoria', `Meta batida: ${g.text}`);
    } else {
      w = { ...w, manager: gainReputation(gainConfidence(w.manager, -MANAGER.goalFailedConfidence[size]), MANAGER.repGoalFailed) };
    }
  }
  const total = w.manager.goals.length;
  events.push({
    kind: met === total ? 'ok' : met === 0 ? 'alerta' : 'info',
    text: `Diretoria: ${met} de ${total} metas batidas em ${year}. Confiança ${Math.round(w.manager.confidence)}.`,
  });
  if (w.manager.confidence < MANAGER.fireBelow) {
    const team = w.teams[me];
    w = fire(w);
    events.push({ kind: 'alerta', text: `Você foi demitido pela diretoria da ${team.name}. Agora está livre, esperando propostas.` });
    return { world: w, events };
  }
  return { world: assignGoals(w, me), events };
}
