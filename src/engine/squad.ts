// Elenco: titulares e carências de função.
import { playerOvr } from './player';
import type { Player, Role, Team } from './types';

/**
 * Melhores 5 para jogar: um IGL e um AWPer quando houver, completando pelo OVR.
 * Usado pela IA e para corrigir titulares inválidos.
 */
export function bestStarters(team: Team, players: Record<string, Player>): string[] {
  const roster = team.playerIds.map((id) => players[id]).sort((a, b) => playerOvr(b) - playerOvr(a));
  const chosen: Player[] = [];
  for (const role of ['IGL', 'AWPER'] as Role[]) {
    const best = roster.find((p) => p.role === role && !chosen.includes(p));
    if (best) chosen.push(best);
  }
  for (const p of roster) {
    if (chosen.length >= 5) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen.map((p) => p.id);
}

/** Titulares válidos: os 5 escolhidos, se ainda estão no elenco; senão, os melhores. */
export function validStarters(team: Team, players: Record<string, Player>): string[] {
  const ok = team.starters.length === 5 && team.starters.every((id) => team.playerIds.includes(id));
  return ok ? team.starters : bestStarters(team, players);
}

/** Quantos jogadores da função o time tem. */
export const roleCount = (team: Team, players: Record<string, Player>, role: Role) =>
  team.playerIds.filter((id) => players[id].role === role).length;

/** OVR do titular mais fraco daquela função (ou 0 se não houver ninguém). */
export function starterOvrAt(team: Team, players: Record<string, Player>, role: Role): number {
  const ovrs = validStarters(team, players)
    .map((id) => players[id])
    .filter((p) => p.role === role)
    .map(playerOvr);
  return ovrs.length ? Math.min(...ovrs) : 0;
}

/** Função mais fraca do time titular (alvo de reforço da IA). */
export function weakestRole(team: Team, players: Record<string, Player>): { role: Role; ovr: number } {
  const starters = validStarters(team, players).map((id) => players[id]);
  const worst = [...starters].sort((a, b) => playerOvr(a) - playerOvr(b))[0];
  return { role: worst.role, ovr: playerOvr(worst) };
}

/** O jogador seria titular no time? (entra no lugar do titular mais fraco da mesma função ou da mais fraca). */
export function wouldStart(team: Team, players: Record<string, Player>, p: Player): boolean {
  if (team.playerIds.length < 5) return true;
  const sameRole = starterOvrAt(team, players, p.role);
  return sameRole === 0 || playerOvr(p) > sameRole || playerOvr(p) > weakestRole(team, players).ovr + 2;
}
