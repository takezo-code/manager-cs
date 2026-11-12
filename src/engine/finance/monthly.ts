// Fechamento do mês (dia 1º): patrocínios entram, salários saem, atrasos e ofertas de patrocínio.
import { FINANCE, MORALE } from '../config';
import { fanSponsorFactor } from '../media/fans';
import { roundTo } from '../format';
import { sponsorBonus } from '../manager/effects';
import { teamBusy } from '../calendar';
import { releasePlayer } from '../market/transfer';
import type { Rng } from '../rng';
import type { Team } from '../types';
import type { World, WorldEvent } from '../world';
import { addMoney } from '../world';
import { freeSlots, makeOffer, toContract } from './sponsors';
import { fmtMoney } from '../format';


export const payroll = (w: World, team: Team) =>
  [...team.playerIds, ...(team.academyIds ?? [])].reduce((s, id) => s + (w.players[id]?.contract?.salary ?? 0), 0) +
  Object.values(team.staff ?? {}).reduce((s, id) => s + (id ? (w.staff?.[id]?.contract?.salary ?? 0) : 0), 0);

export const sponsorIncome = (team: Team, date: string) =>
  team.sponsors.filter((s) => s.endDate >= date).reduce((s, x) => s + x.monthly, 0);

/** Projeção do caixa daqui a N meses (patrocínios ativos − folha atual). */
export function projectedBalance(w: World, teamId: string, months: number): number {
  const t = w.teams[teamId];
  let money = t.money - t.arrears;
  let date = w.date;
  for (let i = 0; i < months; i++) {
    const d = new Date(`${date}T00:00:00Z`);
    date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    money += sponsorIncome(t, date) - payroll(w, t);
  }
  return money;
}

function setTeam(w: World, team: Team): World {
  return { ...w, teams: { ...w.teams, [team.id]: team } };
}

function changeSatisfaction(w: World, teamId: string, delta: number): World {
  const players = { ...w.players };
  for (const id of w.teams[teamId].playerIds) {
    const p = players[id];
    players[id] = { ...p, satisfaction: Math.max(0, Math.min(100, p.satisfaction + delta)) };
  }
  return { ...w, players };
}

/**
 * Fecha o mês. Com `allowDepartures` falso (campeonato em andamento), ninguém rescinde: os elencos
 * ficam travados até o fim do evento, e a rescisão acontece no primeiro fechamento depois dele.
 */
export function monthlyFinance(world: World, rng: Rng): { world: World; events: WorldEvent[] } {
  let w = world;
  const events: WorldEvent[] = [];
  const mine = w.managerTeamId;

  for (const id of Object.keys(w.teams)) {
    let team = w.teams[id];
    // Patrocinadores vencidos saem da lista.
    team = { ...team, sponsors: team.sponsors.filter((s) => s.endDate >= w.date) };
    w = setTeam(w, team);

    // 1) Patrocínios entram.
    for (const s of team.sponsors) w = addMoney(w, id, s.monthly, 'patrocinio', s.brand);
    team = w.teams[id];

    // 2) Salários: paga o atrasado e o mês; se não der, atrasa tudo.
    const due = payroll(w, team) + team.arrears;
    if (team.money >= due) {
      if (team.arrears && id === mine) events.push({ kind: 'ok', text: `Salários atrasados quitados (${fmtMoney(team.arrears)}).` });
      w = addMoney(w, id, -due, 'salarios', team.arrears ? 'Folha do mês + atrasados' : 'Folha do mês');
      w = setTeam(w, { ...w.teams[id], arrears: 0, lateMonths: 0 });
    } else {
      w = setTeam(w, { ...team, arrears: due, lateMonths: team.lateMonths + 1 });
      w = changeSatisfaction(w, id, MORALE.monthly.lateSalary);
      if (id === mine)
        events.push({ kind: 'alerta', text: `Salários atrasados! Faltou dinheiro para a folha (${fmtMoney(due)} devidos). O elenco ficou insatisfeito e patrocinadores estão de olho.` });
      // Patrocinador rompe depois de alguns meses de atraso.
      const late = w.teams[id];
      if (late.lateMonths >= FINANCE.sponsorLeavesAfterLate && late.sponsors.length) {
        const gone = late.sponsors[late.sponsors.length - 1];
        w = setTeam(w, { ...late, sponsors: late.sponsors.slice(0, -1) });
        if (id === mine) events.push({ kind: 'alerta', text: `${gone.brand} rompeu o patrocínio por causa dos salários atrasados.` });
      }
      // Jogadores insatisfeitos rescindem e saem de graça.
      if (!teamBusy(w.calendar, id) && w.teams[id].lateMonths >= FINANCE.playersLeaveAfterLate) {
        for (const pid of w.teams[id].playerIds) {
          const p = w.players[pid];
          if (p.satisfaction < FINANCE.rescindBelowSatisfaction && w.teams[id].playerIds.length > 1) {
            w = releasePlayer(w, pid, 'rescisao');
            if (id === mine) events.push({ kind: 'alerta', text: `${p.nick} rescindiu por causa dos salários atrasados e saiu de graça.` });
          }
        }
      }
    }

    // 3) Patrocínio novo.
    team = w.teams[id];
    if (team.lateMonths > 0) continue; // patrocinadores afastados
    const slots = freeSlots(team, w.date);
    if (id === mine) {
      const n = rng.int(FINANCE.offersPerMonth[0], FINANCE.offersPerMonth[1]);
      const used = [...team.sponsors.map((s) => s.brand), ...w.sponsorOffers.map((o) => o.brand)];
      const offers = [];
      for (let i = 0; i < n; i++) {
        const slot = slots.master && rng.chance(0.35) ? 'master' : 'regular';
        const raw = makeOffer(team, slot, w.date, rng, used);
        // Finanças do manager: patrocínios melhores.
        const o = { ...raw, monthly: roundTo(raw.monthly * (1 + sponsorBonus(w)) * fanSponsorFactor(w), 1000) };
        used.push(o.brand);
        offers.push(o);
      }
      w = { ...w, sponsorOffers: [...w.sponsorOffers.filter((o) => o.expires >= w.date), ...offers] };
      events.push({ kind: 'info', text: `${n === 1 ? 'Chegou 1 proposta' : `Chegaram ${n} propostas`} de patrocínio.` });
    } else {
      // IA assina sozinha para preencher as vagas.
      const used = team.sponsors.map((s) => s.brand);
      const sponsors = [...team.sponsors];
      if (slots.master) sponsors.push(toContract(makeOffer(team, 'master', w.date, rng, used), w.date));
      for (let i = 0; i < slots.regular; i++) {
        const o = makeOffer(team, 'regular', w.date, rng, [...used, ...sponsors.map((s) => s.brand)]);
        sponsors.push(toContract(o, w.date));
      }
      w = setTeam(w, { ...team, sponsors });
    }
  }
  return { world: w, events };
}
