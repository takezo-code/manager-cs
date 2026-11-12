// Histórico da carreira: melhor posição no ranking e as maiores compras e vendas.
import type { World } from '../world';
import type { Deal } from './model';

const TOP = 3;
const top = (list: Deal[]) => [...list].sort((a, b) => b.fee - a.fee).slice(0, TOP);

/** Atualiza o histórico com o dia de hoje (posição atual e negócios fechados hoje pelo seu time). */
export function trackHistory(w: World): World {
  const me = w.managerTeamId;
  if (!me) return w;
  const m = w.manager;
  const rank = w.teams[me].hltvRank;
  const today = w.transferLog.filter((e) => e.date === w.date && e.fee > 0 && (e.kind === 'transferencia' || e.kind === 'multa'));
  const toDeal = (e: (typeof today)[number], teamId: string): Deal => ({ playerId: e.playerId, nick: w.players[e.playerId]?.nick ?? e.playerId, fee: e.fee, date: e.date, teamId });
  const buys = today.filter((e) => e.toTeamId === me).map((e) => toDeal(e, me));
  const sales = today.filter((e) => e.fromTeamId === me).map((e) => toDeal(e, me));
  const bestRank = m.bestRank === null ? rank : Math.min(m.bestRank, rank);
  if (bestRank === m.bestRank && !buys.length && !sales.length) return w;
  return { ...w, manager: { ...m, bestRank, buys: top([...m.buys, ...buys]), sales: top([...m.sales, ...sales]) } };
}
