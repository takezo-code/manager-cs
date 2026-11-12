// Reputação do manager: títulos, metas e saúde financeira. Ajuda a convencer jogadores.
import { MANAGER } from '../config';
import type { FormatId } from '../tournament/types';
import type { World } from '../world';
import { gainReputation } from './model';

/** Título de um evento: reputação conforme o tamanho e registro no histórico (só o do seu time). */
export function titleReputation(w: World, championId: string, format: FormatId, teams: number, eventName: string): World {
  if (!w.managerTeamId || championId !== w.managerTeamId) return w;
  const gain = format === 'major32' || format === 'ewc32' ? MANAGER.repMajor : teams >= 16 ? MANAGER.repBig : MANAGER.repSmall;
  const m = gainReputation(w.manager, gain);
  return { ...w, manager: { ...m, titles: [...m.titles, { event: eventName, date: w.date, teamId: championId }] } };
}

/** 0 a 1 conforme a reputação (só vale quando o comprador é o seu time). */
export const reputationShare = (w: World, buyerId: string) => (w.managerTeamId && buyerId === w.managerTeamId ? w.manager.reputation / 100 : 0);
