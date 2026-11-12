// Execução de transferências, trocas e contratos (move jogadores, dinheiro e relações).
import { MARKET } from '../config';
import { bestStarters } from '../squad';
import type { Contract, Player, Team } from '../types';
import { addMoney, type TransferEntry, type TransferKind, type World } from '../world';
import { changeRelation } from './relations';

function withoutPlayer(team: Team, playerId: string): Team {
  return {
    ...team,
    playerIds: team.playerIds.filter((id) => id !== playerId),
    starters: team.starters.filter((id) => id !== playerId),
    academyIds: (team.academyIds ?? []).filter((id) => id !== playerId),
  };
}

/** Recalcula titulares quando ficaram incompletos (alguém saiu). */
function fixStarters(team: Team, players: Record<string, Player>): Team {
  if (team.starters.length === Math.min(5, team.playerIds.length) && team.starters.every((id) => team.playerIds.includes(id))) return team;
  if (team.playerIds.length < 5) return { ...team, starters: [...team.playerIds] };
  // Mantém quem já era titular e completa com os melhores.
  const keep = team.starters.filter((id) => team.playerIds.includes(id));
  const best = bestStarters(team, players).filter((id) => !keep.includes(id));
  return { ...team, starters: [...keep, ...best].slice(0, 5) };
}

/**
 * Move um jogador para outro time (ou para os agentes livres, com toTeamId null).
 * Não mexe em dinheiro nem relação: quem chama decide.
 */
export function movePlayer(w: World, playerId: string, toTeamId: string | null, contract: Contract | null): World {
  const p = w.players[playerId];
  const teams = { ...w.teams };
  if (p.teamId) teams[p.teamId] = withoutPlayer(teams[p.teamId], playerId);
  // Quem sai do time deixa também a academy.
  const moved: Player = { ...p, teamId: toTeamId, contract, transferListed: false, squad: 'principal' };
  const players = { ...w.players, [playerId]: moved };
  if (toTeamId) {
    const t = teams[toTeamId];
    teams[toTeamId] = { ...t, playerIds: [...t.playerIds, playerId] };
  }
  for (const id of [p.teamId, toTeamId]) if (id) teams[id] = fixStarters(teams[id], players);
  return { ...w, teams, players };
}

const log = (w: World, e: Omit<TransferEntry, 'date'>): World => ({ ...w, transferLog: [{ date: w.date, ...e }, ...w.transferLog].slice(0, 300) });

/** Dinheiro de um time para outro, com registro no extrato (contratação de um lado, venda do outro). */
const pay = (w: World, from: string | null, to: string | null, amount: number, note: string): World => {
  if (!amount) return w;
  let next = w;
  if (from) next = addMoney(next, from, -amount, 'contratacao', note);
  if (to) next = addMoney(next, to, amount, 'venda', note);
  return next;
};

/** Transferência com taxa (ou pagamento de multa). */
export function executeTransfer(w: World, playerId: string, buyerId: string, fee: number, contract: Contract, kind: TransferKind): World {
  const sellerId = w.players[playerId].teamId;
  let next = movePlayer(w, playerId, buyerId, contract);
  next = pay(next, buyerId, sellerId, fee, w.players[playerId].nick);
  if (sellerId) {
    const delta = kind === 'multa' ? MARKET.relationOnClausePaid : MARKET.relationOnDeal;
    next = { ...next, relations: changeRelation(next.relations, buyerId, sellerId, delta) };
  }
  return log(next, { kind: sellerId ? kind : 'livre', playerId, fromTeamId: sellerId, toTeamId: buyerId, fee });
}

/** Troca jogador por jogador; `money` é o que o time A paga ao B (negativo: B paga a A). Contratos seguem iguais. */
export function executeTrade(w: World, teamA: string, playerA: string, teamB: string, playerB: string, money: number): World {
  const ca = w.players[playerA].contract!;
  const cb = w.players[playerB].contract!;
  let next = movePlayer(w, playerA, teamB, { ...ca, teamId: teamB });
  next = movePlayer(next, playerB, teamA, { ...cb, teamId: teamA });
  const note = `Troca ${w.players[playerA].nick} × ${w.players[playerB].nick}`;
  next = money >= 0 ? pay(next, teamA, teamB, money, note) : pay(next, teamB, teamA, -money, note);
  next = { ...next, relations: changeRelation(next.relations, teamA, teamB, MARKET.relationOnDeal) };
  return log(next, { kind: 'troca', playerId: playerB, fromTeamId: teamB, toTeamId: teamA, fee: money, otherPlayerId: playerA });
}

export function executeRenewal(w: World, playerId: string, contract: Contract): World {
  const p = w.players[playerId];
  const next = { ...w, players: { ...w.players, [playerId]: { ...p, contract } } };
  return log(next, { kind: 'renovacao', playerId, fromTeamId: p.teamId, toTeamId: p.teamId, fee: 0 });
}

/** Libera para os agentes livres (fim de contrato ou dispensa da IA). */
export function releasePlayer(w: World, playerId: string, kind: 'fim_contrato' | 'dispensa' | 'rescisao'): World {
  const from = w.players[playerId].teamId;
  return log(movePlayer(w, playerId, null, null), { kind, playerId, fromTeamId: from, toTeamId: null, fee: 0 });
}
