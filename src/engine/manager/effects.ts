// Efeitos e crescimento dos atributos do manager. Tudo é 0 com atributos iniciais (30) ou desempregado.
import { MANAGER } from '../config';
import type { World } from '../world';
import { attrEffect, gainAttr, gainReputation, type Manager, type ManagerAttr } from './model';

/** O manager, se estiver empregado. */
const active = (w: World): Manager | null => (w.managerTeamId && w.manager ? w.manager : null);
const eff = (w: World, k: ManagerAttr) => {
  const m = active(w);
  return m ? attrEffect(m, k) : 0;
};

/** Desconto no preço pedido nas suas compras (Negociação). */
export const negotiationDiscount = (w: World) => MANAGER.negotiationMax * eff(w, 'NEG');
/** A mais nas propostas que a IA faz pelos seus jogadores (Negociação). */
export const saleBonus = (w: World) => MANAGER.negotiationMax * eff(w, 'NEG');
/** A mais no valor das ofertas de patrocínio (Finanças). */
export const sponsorBonus = (w: World) => MANAGER.sponsorMax * eff(w, 'FIN');
/** Desconto no salário pedido pelos jogadores (Finanças). */
export const financeSalaryDiscount = (w: World) => MANAGER.salaryMax * eff(w, 'FIN');
/** Quanto a faixa do olheiro estreita (Olho pra talento). */
export const scoutNarrowing = (w: World) => MANAGER.talentMax * eff(w, 'TAL');
/** Gestão de vestiário, de 0 a 1. */
export const lockerRoom = (w: World) => eff(w, 'VES');

const withManager = (w: World, m: Manager): World => ({ ...w, manager: m });

/** Dia 1º: caixa saudável faz Finanças crescer; elenco satisfeito, Gestão de vestiário. */
export function monthlyManagerGrowth(w: World): World {
  const m = active(w);
  if (!m) return w;
  const t = w.teams[w.managerTeamId];
  let next = m;
  if (t.money > 0 && t.lateMonths === 0) next = gainReputation(gainAttr(next, 'FIN', MANAGER.monthlyGrowth), MANAGER.repHealthyMonth);
  const sats = t.playerIds.map((id) => w.players[id]?.satisfaction ?? 0);
  if (sats.length && sats.reduce((a, b) => a + b, 0) / sats.length >= MANAGER.happySquad) next = gainAttr(next, 'VES', MANAGER.monthlyGrowth);
  return withManager(w, next);
}

/** Negócios fechados hoje pelo seu time (compras e vendas): Negociação cresce. */
export function managerDealsDay(w: World): World {
  const m = active(w);
  if (!m) return w;
  const me = w.managerTeamId;
  const deals = w.transferLog.filter(
    (e) => e.date === w.date && (e.kind === 'transferencia' || e.kind === 'multa' || e.kind === 'troca') && (e.toTeamId === me || e.fromTeamId === me),
  );
  return deals.length ? withManager(w, gainAttr(m, 'NEG', MANAGER.dealGrowth * deals.length)) : w;
}

/** Jovem promovido da sua academy: Olho pra talento cresce. */
export function onYouthPromoted(w: World): World {
  const m = active(w);
  return m ? withManager(w, gainAttr(m, 'TAL', MANAGER.promoteGrowth)) : w;
}
