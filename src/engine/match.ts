// Simulação de partida round a round: economia, duelos, trades, bomba, clutches e narração.
import { ECONOMY, MAP_NAMES, PASSIVE_BONUS, SIM } from './config';
import { effectiveAttributes } from './player';
import { createRng, type Rng } from './rng';
import { calcRating } from './rating';
import { mapsToPlay, runVeto } from './veto';
import type {
  Attributes,
  BuyType,
  MapId,
  MapResult,
  MatchFormat,
  MatchResult,
  MatchStage,
  Player,
  PlayerMatchStats,
  RoundEndReason,
  RoundResult,
  Side,
  SkillId,
  Team,
} from './types';

export interface MatchInput {
  teamA: Team;
  teamB: Team;
  /** Os 5 titulares de cada time. */
  playersA: Player[];
  playersB: Player[];
  format: MatchFormat;
  stage: MatchStage;
  seed: number;
}

interface SimPlayer {
  id: string;
  nick: string;
  role: Player['role'];
  skill: SkillId | null;
  attrs: Attributes;
  /** Bônus fixo da partida: forma, pressão e cansaço. */
  matchMod: number;
  money: number;
  /** Sobreviveu com arma comprada no round anterior. */
  keptWeapon: boolean;
  keptAwp: boolean;
  // estado do round
  alive: boolean;
  hasAwp: boolean;
  equip: number;
  killsThisRound: number;
  assistedThisRound: boolean;
  tradedThisRound: boolean;
}

interface SimTeam {
  team: Team;
  players: SimPlayer[];
  callBonus: number;
  utility: number;
  tradeSkill: number;
  lossCount: number;
  wonLast: boolean;
}

const has = (p: SimPlayer, s: SkillId) => p.skill === s;

function buildSimTeam(team: Team, players: Player[], stage: MatchStage, rng: Rng): SimTeam {
  const sims: SimPlayer[] = players.map((pl) => {
    const attrs = effectiveAttributes(pl);
    const formFactor = 1 - (attrs.MEN - 50) / 100; // Mental alto = menos oscilação
    const form = rng.gaussian() * SIM.formSpread * Math.max(0.3, formFactor);
    const pressure = pl.skillId === 'sangue_frio' ? 0 : SIM.pressure[stage] * Math.max(0, 85 - attrs.MEN);
    const fatigue = Math.max(0, SIM.energyThreshold - pl.energy) * SIM.energyPenaltyPerPoint;
    return {
      id: pl.id,
      nick: pl.nick,
      role: pl.role,
      skill: pl.skillId,
      attrs,
      matchMod: form - pressure - fatigue,
      money: ECONOMY.startMoney,
      keptWeapon: false,
      keptAwp: false,
      alive: true,
      hasAwp: false,
      equip: 0,
      killsThisRound: 0,
      assistedThisRound: false,
      tradedThisRound: false,
    };
  });
  const igl = sims.find((p) => p.role === 'IGL') ?? [...sims].sort((a, b) => b.attrs.EQP - a.attrs.EQP)[0];
  const call = igl.attrs.EQP * 0.6 + igl.attrs.NOC * 0.4;
  const callBonus = (call - 70) * SIM.iglCallWeight + (has(igl, 'cerebro_tatico') ? PASSIVE_BONUS.cerebroTaticoTeam : 0);
  const avg = (k: keyof Attributes) => sims.reduce((s, p) => s + p.attrs[k], 0) / sims.length;
  return {
    team,
    players: sims,
    callBonus,
    utility: (avg('UTL') - 70) * SIM.utilityWeight,
    tradeSkill: (avg('EQP') - 70) * 0.004,
    lossCount: 1,
    wonLast: false,
  };
}

/** Poder de duelo base: Mira, Reflexo e Noção de jogo. */
const duelBase = (p: SimPlayer) => p.attrs.MIR * 0.45 + p.attrs.REF * 0.35 + p.attrs.NOC * 0.2;

function lossBonus(lossCount: number) {
  return ECONOMY.lossBonus[Math.min(lossCount, ECONOMY.lossBonus.length - 1)];
}

function decideBuy(t: SimTeam, side: Side, roundInHalf: number, isPistol: boolean, isLastOfHalf: boolean, rng: Rng): BuyType {
  if (isPistol) return 'pistol';
  const avg = t.players.reduce((s, p) => s + p.money, 0) / t.players.length;
  const kept = t.players.filter((p) => p.keptWeapon).length;
  const full = side === 'T' ? ECONOMY.cost.fullT : ECONOMY.cost.fullCT;
  // Quem tem arma guardada precisa de menos dinheiro.
  const needed = full - (kept / t.players.length) * (full - ECONOMY.cost.refill);
  if (avg >= needed) return 'full';
  if (isLastOfHalf) return avg >= 1200 ? 'force' : 'eco';
  // Só economiza quem perdeu o round anterior; quem ganhou mantém a pressão.
  if (!t.wonLast && avg + lossBonus(t.lossCount) >= full) return rng.chance(0.2) && avg >= 2000 ? 'force' : 'eco';
  if (avg >= 2000) return 'force';
  void roundInHalf;
  return 'eco';
}

function applyBuy(t: SimTeam, buy: BuyType, side: Side) {
  for (const p of t.players) {
    p.alive = true;
    p.killsThisRound = 0;
    p.assistedThisRound = false;
    p.tradedThisRound = false;
    p.hasAwp = false;
    if (buy === 'pistol') {
      p.money -= Math.min(p.money, 650);
      p.equip = 0;
      continue;
    }
    if (p.keptWeapon) {
      const cost = Math.min(p.money, ECONOMY.cost.refill);
      p.money -= cost;
      p.hasAwp = p.keptAwp;
      p.equip = 0;
      continue;
    }
    if (buy === 'full') {
      const full = side === 'T' ? ECONOMY.cost.fullT : ECONOMY.cost.fullCT;
      const wantsAwp = p.role === 'AWPER' && p.money >= ECONOMY.cost.fullAwp;
      const cost = wantsAwp ? ECONOMY.cost.fullAwp : full;
      if (p.money >= cost) {
        p.money -= cost;
        p.hasAwp = wantsAwp;
        p.equip = 0;
      } else {
        // Sem dinheiro para o full: force individual.
        p.money -= Math.min(p.money, ECONOMY.cost.force);
        p.equip = SIM.equipForce;
      }
    } else if (buy === 'force') {
      p.money -= Math.min(p.money, ECONOMY.cost.force);
      p.equip = SIM.equipForce;
    } else {
      p.equip = SIM.equipEco;
    }
  }
}

function killReward(p: SimPlayer, buy: BuyType): number {
  if (p.hasAwp) return ECONOMY.killRewardAwp;
  if (buy === 'force' && !p.keptWeapon) return ECONOMY.killRewardSmg;
  if (buy === 'pistol' || buy === 'eco') return ECONOMY.killRewardPistol;
  return ECONOMY.killRewardRifle;
}

function emptyStats(id: string): PlayerMatchStats {
  return { playerId: id, kills: 0, deaths: 0, assists: 0, damage: 0, firstKills: 0, clutchesWon: 0, kastRounds: 0, rounds: 0 };
}

interface RoundCtx {
  side: Record<number, Side>;
  buys: [BuyType, BuyType];
  isPistol: boolean;
  map: MapId;
}

function simulateRound(
  teams: [SimTeam, SimTeam],
  ctx: RoundCtx,
  stats: Record<string, PlayerMatchStats>,
  rng: Rng,
): { winner: 0 | 1; reason: RoundEndReason; highlight: string; planted: boolean } {
  const tIdx = ctx.side[0] === 'T' ? 0 : 1;
  const ctIdx = (1 - tIdx) as 0 | 1;
  const alive = (i: number) => teams[i].players.filter((p) => p.alive);
  let planted = false;
  let first = true;
  const clutcher: Record<number, { id: string; vs: number } | null> = { 0: null, 1: null };
  let openingNick = '';
  // Leitura tática do round (strat que encaixa ou não): variação de time, independente da habilidade.
  const roundNoise = [rng.gaussian() * SIM.roundNoise, rng.gaussian() * SIM.roundNoise];

  const power = (p: SimPlayer, i: number, opening: boolean): number => {
    const team = teams[i];
    const mine = alive(i).length;
    const theirs = alive(1 - i).length;
    let v = duelBase(p) + p.matchMod + team.callBonus + roundNoise[i];
    v += (team.team.mapStrength[ctx.map] - 75) * SIM.mapStrengthWeight;
    v += (mine - theirs) * SIM.numbersAdvantage;
    const isT = i === tIdx;
    if (isT && !planted) v += team.utility; // execute
    if (!isT && planted) v += team.utility - 3; // retake contra pós-plant
    if (!isT && !planted && has(p, 'muralha')) v += PASSIVE_BONUS.muralhaCT;
    if (p.hasAwp) v += 2 + (has(p, 'mao_de_ouro') ? PASSIVE_BONUS.maoDeOuro : 0);
    else if (p.equip === 0 && !ctx.isPistol && has(p, 'mestre_do_spray')) v += PASSIVE_BONUS.mestreDoSpray;
    if (ctx.isPistol && has(p, 'rei_do_pistol')) v += PASSIVE_BONUS.reiDoPistol;
    if (opening && has(p, 'sem_medo')) v += PASSIVE_BONUS.semMedoOpening;
    if (!opening && isT && p.role === 'LURKER' && has(p, 'fantasma')) v += PASSIVE_BONUS.fantasmaFlank;
    if (mine === 1 && theirs >= 2) {
      v += (p.attrs.MEN - 75) * 0.3;
      if (has(p, 'deus_do_clutch')) v += PASSIVE_BONUS.deusDoClutch;
    }
    const flasher = alive(i).find((q) => q !== p && has(q, 'flash_perfeito'));
    if (flasher && rng.chance(0.4)) v += PASSIVE_BONUS.flashPerfeito;
    return v;
  };

  const pickDuelist = (i: number, opening: boolean): SimPlayer => {
    const isT = i === tIdx;
    return rng.weighted(alive(i), (p) => {
      if (opening && isT) return p.role === 'ENTRY' ? 4 : p.role === 'LURKER' ? 0.5 : 1;
      if (opening) return p.role === 'AWPER' ? 2.5 : 1;
      if (isT && p.role === 'LURKER') return has(p, 'fantasma') ? 2 : 1.3;
      return 1;
    });
  };

  const registerKill = (killer: SimPlayer, ki: number, victim: SimPlayer, opening: boolean) => {
    victim.alive = false;
    killer.killsThisRound++;
    stats[killer.id].kills++;
    stats[victim.id].deaths++;
    stats[victim.id].damage += rng.int(0, 30); // dano que a vítima causou antes de morrer
    if (opening) {
      stats[killer.id].firstKills++;
      openingNick = killer.nick;
    }
    killer.money += killReward(killer, ctx.buys[ki]);
    // 100 de dano por kill, dividido com quem deu assistência.
    let killerDamage = 100;
    const helpers = alive(ki).filter((p) => p !== killer);
    if (helpers.length && rng.chance(0.3)) {
      const h = rng.pick(helpers);
      const dmg = rng.int(41, 70);
      h.assistedThisRound = true;
      stats[h.id].assists++;
      stats[h.id].damage += dmg;
      killerDamage -= dmg;
    }
    stats[killer.id].damage += killerDamage;
  };

  /** Duelo entre x (time xi) e y (time yi). `edge` é vantagem extra de x (em logit). Retorna true se x vence. */
  const duel = (x: SimPlayer, xi: number, y: SimPlayer, yi: number, opening: boolean, edge: number): boolean => {
    const skill = (power(x, xi, opening) - power(y, yi, opening)) / SIM.duelScale;
    const equip = (x.equip - y.equip) / SIM.equipScale;
    return rng.chance(1 / (1 + Math.exp(-(skill + equip + edge))));
  };

  let saveEnded: { winner: 0 | 1; reason: RoundEndReason } | null = null;

  while (alive(0).length > 0 && alive(1).length > 0) {
    if (!planted && !first) {
      const diff = alive(tIdx).length - alive(ctIdx).length;
      const p = SIM.plantChance * (1 + 0.35 * diff);
      if (rng.chance(Math.max(0.05, Math.min(0.9, p)))) planted = true;
    }
    const a = pickDuelist(0, first);
    const b = pickDuelist(1, first);
    const aWins = duel(a, 0, b, 1, first, 0);
    const [killer, ki, victim, vi] = aWins ? [a, 0, b, 1] : [b, 1, a, 0];
    registerKill(killer, ki, victim, first);
    first = false;

    // Trade: um companheiro da vítima pode estar em posição de devolver a kill.
    // A chance de estar em posição vem de Equipe; o trade em si é um duelo, com vantagem para quem troca.
    const mates = alive(vi);
    if (mates.length && killer.alive) {
      const bonus = mates.some((m) => has(m, 'trade_instantaneo')) ? PASSIVE_BONUS.tradeInstantaneo : 0;
      if (rng.chance(SIM.baseTradeChance + teams[vi].tradeSkill + bonus)) {
        const trader = rng.weighted(mates, (m) => (has(m, 'trade_instantaneo') ? 2 : 1));
        if (duel(trader, vi, killer, ki, false, SIM.tradeEdge)) {
          registerKill(trader, vi, killer, false);
          victim.tradedThisRound = true;
        } else {
          registerKill(killer, ki, trader, false);
        }
      }
    }

    // Clutch: registra quem ficou sozinho contra 2 ou mais.
    for (const i of [0, 1]) {
      const mine = alive(i);
      const theirs = alive(1 - i).length;
      if (mine.length === 1 && theirs >= 2 && !clutcher[i]) clutcher[i] = { id: mine[0].id, vs: theirs };
    }

    // Save: lado sem chance desiste do round para guardar armas.
    const nT = alive(tIdx).length;
    const nCT = alive(ctIdx).length;
    if (nT > 0 && nCT > 0) {
      if (planted && nCT <= 2 && nT >= nCT + 2 && rng.chance(0.45)) {
        saveEnded = { winner: tIdx as 0 | 1, reason: 'bomba' };
        break;
      }
      if (!planted && nT <= 1 && nCT >= 3 && rng.chance(0.4)) {
        saveEnded = { winner: ctIdx, reason: 'tempo' };
        break;
      }
    }
  }

  let winner: 0 | 1;
  let reason: RoundEndReason;
  if (saveEnded) {
    ({ winner, reason } = saveEnded);
  } else if (alive(tIdx).length === 0) {
    if (planted) {
      const chance = SIM.defuseAfterClearChance + (alive(ctIdx).length - 1) * 0.03;
      if (rng.chance(chance)) {
        winner = ctIdx;
        reason = 'defuse';
      } else {
        winner = tIdx as 0 | 1;
        reason = 'bomba';
      }
    } else {
      winner = ctIdx;
      reason = 'eliminacao';
    }
  } else {
    winner = tIdx as 0 | 1;
    reason = planted ? 'bomba' : 'eliminacao';
  }

  // Destaques para a narração.
  let highlight = '';
  const c = clutcher[winner];
  const clutchPlayer = c ? teams[winner].players.find((p) => p.id === c.id) : null;
  if (c && clutchPlayer && (clutchPlayer.alive || reason === 'defuse' || reason === 'bomba')) {
    stats[c.id].clutchesWon++;
    highlight = `${clutchPlayer.nick} vence o clutch 1v${c.vs}!`;
  } else {
    const top = [...teams[winner].players].sort((x, y) => y.killsThisRound - x.killsThisRound)[0];
    if (top.killsThisRound >= 5) highlight = `ACE de ${top.nick}!`;
    else if (top.killsThisRound === 4) highlight = `${top.nick} faz um quadra kill.`;
    else if (top.killsThisRound === 3) highlight = `${top.nick} faz um triple kill.`;
    else if (openingNick) highlight = `Abertura de ${openingNick}.`;
  }

  // KAST e rounds jogados.
  for (const t of teams)
    for (const p of t.players) {
      stats[p.id].rounds++;
      if (p.killsThisRound > 0 || p.assistedThisRound || p.alive || p.tradedThisRound) stats[p.id].kastRounds++;
    }

  return { winner, reason, highlight, planted };
}

const REASON_TEXT: Record<RoundEndReason, string> = {
  eliminacao: 'eliminação',
  bomba: 'bomba explodiu',
  defuse: 'bomba desarmada',
  tempo: 'tempo esgotado',
};

const BUY_TEXT: Record<BuyType, string> = { pistol: 'pistol', eco: 'eco', force: 'force buy', full: 'full buy' };

function payRound(teams: [SimTeam, SimTeam], winner: 0 | 1, reason: RoundEndReason, planted: boolean, tIdx: number) {
  const winReward =
    reason === 'bomba' ? ECONOMY.winBomb : reason === 'defuse' ? ECONOMY.winDefuse : reason === 'tempo' ? ECONOMY.winTime : ECONOMY.winElimination;
  const loser = (1 - winner) as 0 | 1;
  for (const p of teams[winner].players) p.money += winReward;
  const lb = lossBonus(teams[loser].lossCount);
  const plant = loser === tIdx && planted ? ECONOMY.plantBonusOnLoss : 0;
  for (const p of teams[loser].players) p.money += lb + plant;
  teams[loser].lossCount = Math.min(teams[loser].lossCount + 1, ECONOMY.lossBonus.length - 1);
  teams[winner].lossCount = Math.max(teams[winner].lossCount - 1, 0);
  teams[winner].wonLast = true;
  teams[loser].wonLast = false;
  for (const t of teams)
    for (const p of t.players) {
      p.money = Math.min(p.money, ECONOMY.maxMoney);
    }
}

function resetHalf(teams: [SimTeam, SimTeam], money: number) {
  for (const t of teams) {
    t.lossCount = 1;
    t.wonLast = false;
    for (const p of t.players) {
      p.money = money;
      p.keptWeapon = false;
      p.keptAwp = false;
    }
  }
}

export function simulateMap(
  map: MapId,
  teams: [SimTeam, SimTeam],
  firstCT: 0 | 1,
  pickedBy: string | null,
  rng: Rng,
): MapResult {
  const stats: Record<string, PlayerMatchStats> = {};
  for (const t of teams) for (const p of t.players) stats[p.id] = emptyStats(p.id);
  const score: [number, number] = [0, 0];
  const rounds: RoundResult[] = [];
  const ids = [teams[0].team.id, teams[1].team.id];
  let overtimes = 0;

  const playRound = (n: number, ctTeam: 0 | 1, isPistol: boolean, isLastOfHalf: boolean, roundInHalf: number) => {
    const tIdx = (1 - ctTeam) as 0 | 1;
    const side: Record<number, Side> = { [ctTeam]: 'CT', [tIdx]: 'T' };
    const buys: [BuyType, BuyType] = [
      decideBuy(teams[0], side[0], roundInHalf, isPistol, isLastOfHalf, rng),
      decideBuy(teams[1], side[1], roundInHalf, isPistol, isLastOfHalf, rng),
    ];
    applyBuy(teams[0], buys[0], side[0]);
    applyBuy(teams[1], buys[1], side[1]);
    const r = simulateRound(teams, { side, buys, isPistol, map }, stats, rng);
    payRound(teams, r.winner, r.reason, r.planted, tIdx);
    // Sobreviventes guardam a arma (exceto pistol/eco, que só têm pistola).
    teams.forEach((t, i) =>
      t.players.forEach((p) => {
        const bought = buys[i] === 'full' || buys[i] === 'force' || p.keptWeapon;
        p.keptAwp = p.alive && p.hasAwp;
        p.keptWeapon = p.alive && bought;
      }),
    );
    score[r.winner]++;
    const winnerName = teams[r.winner].team.shortName;
    const loser = 1 - r.winner;
    let narration = `${winnerName} vence (${REASON_TEXT[r.reason]}).`;
    if ((buys[r.winner] === 'eco' || buys[r.winner] === 'force') && buys[loser] === 'full')
      narration = `${winnerName} vence no ${BUY_TEXT[buys[r.winner]]}! (${REASON_TEXT[r.reason]})`;
    if (r.highlight) narration += ` ${r.highlight}`;
    rounds.push({
      number: n,
      winnerTeamId: ids[r.winner],
      reason: r.reason,
      ctTeamId: ids[ctTeam],
      buys: { [ids[0]]: buys[0], [ids[1]]: buys[1] },
      scoreAfter: { [ids[0]]: score[0], [ids[1]]: score[1] },
      narration,
    });
  };

  // Tempo regulamentar: MR12, troca de lado no round 13.
  const half = SIM.regulationRounds / 2;
  let n = 0;
  resetHalf(teams, ECONOMY.startMoney);
  while (n < SIM.regulationRounds && score[0] < SIM.roundsToWin && score[1] < SIM.roundsToWin) {
    if (n === half) resetHalf(teams, ECONOMY.startMoney);
    const inSecondHalf = n >= half;
    const ct = (inSecondHalf ? 1 - firstCT : firstCT) as 0 | 1;
    const roundInHalf = inSecondHalf ? n - half : n;
    playRound(n + 1, ct, roundInHalf === 0, roundInHalf === half - 1, roundInHalf);
    n++;
  }

  // Prorrogação: MR3 (6 rounds, vence quem fizer 4), repetindo enquanto empatar.
  let ctOt = (1 - firstCT) as 0 | 1; // terminou o regulamentar no lado oposto ao inicial
  while (score[0] === score[1]) {
    overtimes++;
    const base: [number, number] = [score[0], score[1]];
    const otHalf = SIM.overtimeHalf;
    ctOt = (1 - ctOt) as 0 | 1;
    for (let k = 0; k < otHalf * 2; k++) {
      if (k === 0 || k === otHalf) resetHalf(teams, ECONOMY.overtimeStartMoney);
      const ct = (k < otHalf ? ctOt : 1 - ctOt) as 0 | 1;
      playRound(++n, ct, false, k === otHalf - 1 || k === otHalf * 2 - 1, k % otHalf);
      if (score[0] - base[0] > otHalf || score[1] - base[1] > otHalf) break;
    }
  }

  const winner = score[0] > score[1] ? 0 : 1;
  return {
    map,
    pickedBy,
    score: { [ids[0]]: score[0], [ids[1]]: score[1] },
    winnerTeamId: ids[winner],
    rounds,
    stats,
    overtimes,
  };
}

export const MAPS_TO_WIN: Record<MatchFormat, number> = { MD1: 1, MD3: 2, MD5: 3 };

export function simulateMatch(input: MatchInput): MatchResult {
  const rng = createRng(input.seed);
  const { teamA, teamB } = input;
  const veto = runVeto([teamA, teamB], input.format, rng);
  const toPlay = mapsToPlay(veto);
  const need = MAPS_TO_WIN[input.format];
  const mapScore = { [teamA.id]: 0, [teamB.id]: 0 };
  const maps: MapResult[] = [];

  for (const step of toPlay) {
    if (mapScore[teamA.id] === need || mapScore[teamB.id] === need) break;
    // Forma, pressão e cansaço são sorteados por mapa.
    const sims: [SimTeam, SimTeam] = [
      buildSimTeam(teamA, input.playersA, input.stage, rng),
      buildSimTeam(teamB, input.playersB, input.stage, rng),
    ];
    // Quem não escolheu o mapa escolhe o lado; no decider, faca (sorteio).
    const firstCT = rng.chance(0.5) ? 0 : 1;
    const result = simulateMap(step.map, sims, firstCT, step.teamId, rng);
    maps.push(result);
    mapScore[result.winnerTeamId]++;
  }

  const winnerTeamId = mapScore[teamA.id] > mapScore[teamB.id] ? teamA.id : teamB.id;
  const ratings: Record<string, number> = {};
  for (const p of [...input.playersA, ...input.playersB]) {
    const total = emptyStats(p.id);
    for (const m of maps) {
      const s = m.stats[p.id];
      total.kills += s.kills;
      total.deaths += s.deaths;
      total.assists += s.assists;
      total.damage += s.damage;
      total.firstKills += s.firstKills;
      total.clutchesWon += s.clutchesWon;
      total.kastRounds += s.kastRounds;
      total.rounds += s.rounds;
    }
    ratings[p.id] = calcRating(total);
  }

  return {
    seed: input.seed,
    format: input.format,
    stage: input.stage,
    teamAId: teamA.id,
    teamBId: teamB.id,
    veto,
    maps,
    mapScore,
    winnerTeamId,
    ratings,
  };
}

export { MAP_NAMES };
