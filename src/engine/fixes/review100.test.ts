// Garantias de longo prazo: datas dos eventos, um torneio por vez, aposentadoria, folha da IA e economia.
import { describe, expect, it } from 'vitest';
import { buildYear } from '../calendar';
import { daysBetween } from '../date';
import { monthlyFinance, payroll } from '../finance/monthly';
import { expectedSponsorIncome } from '../finance/sponsors';
import { aiMarketDay, aiPayrollCap } from '../market/ai';
import { createRng } from '../rng';
import { issueInvites, startEvents } from '../schedule';
import { createWorld, dailyTick } from '../season';
import { createTournament, playDay } from '../tournament/run';

describe('Calendário e longo prazo (32 times)', () => {
  it('o mundo tem 32 times, com os 8 brasileiros', () => {
    const w = createWorld('furia');
    expect(Object.keys(w.teams)).toHaveLength(32);
    for (const id of ['furia', 'legacy', 'mibr', 'pain', 'imperial', 'fluxo', 'dendele', 'oddik']) expect(w.teams[id], id).toBeDefined();
  });

  it('evento sem times suficientes é cancelado em vez de quebrar', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'iem-inverno')!;
    const base = createWorld('furia');
    const w = { ...base, date: ev.startDate, calendar: [ev], teams: Object.fromEntries(Object.entries(base.teams).slice(0, 3)) };
    const out = startEvents(issueInvites(w).world).world.calendar[0];
    expect(out.status).toBe('encerrado');
    expect(out.tournament).toBeNull();
  });

  it('todo evento cabe nas datas do calendário (formato simulado até o campeão)', () => {
    const w = createWorld('furia');
    const ids = Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);
    const tooLong: string[] = [];
    for (const ev of buildYear(2027)) {
      let t = createTournament({ id: ev.id, name: ev.name, format: ev.format, options: ev.options, prizePool: 0 }, ids.slice(0, ev.teams), 1);
      let days = 0;
      while (!t.championId && days < 40) {
        t = playDay(t, w.teams, w.players).tournament;
        days++;
      }
      if (days > daysBetween(ev.startDate, ev.endDate) + 1) tooLong.push(`${ev.templateId}: ${days} dias`);
    }
    expect(tooLong).toEqual([]);
  }, 60_000);

  it('um time nunca está em dois torneios ao mesmo tempo (um ano)', () => {
    let w = createWorld('furia');
    const clashes: string[] = [];
    while (w.date < '2027-12-31') {
      w = dailyTick(w).world;
      const alive: Record<string, string> = {};
      for (const e of w.calendar) {
        const t = e.tournament;
        if (e.status !== 'em_andamento' || !t || t.championId) continue;
        for (const id of t.participants) {
          if (t.placements[id]) continue;
          if (alive[id]) clashes.push(`${w.date} ${id}: ${alive[id]} + ${e.id}`);
          alive[id] = e.id;
        }
      }
    }
    expect(clashes.slice(0, 5)).toEqual([]);
  }, 90_000);

  it('na virada do ano, agentes livres velhos ou fracos se aposentam e sobram no máximo 300', () => {
    const base = { ...createWorld('furia'), date: '2027-12-31', calendar: [] };
    const sample = Object.values(base.players).find((x) => !x.teamId)!;
    const extra = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`fa${i}`, { ...sample, id: `fa${i}`, age: 22 + (i % 6) }]));
    const w = { ...base, players: { ...base.players, ...extra, velho: { ...sample, id: 'velho', age: 31 } } };
    const out = dailyTick(w).world;
    expect(Object.values(out.players).filter((p) => !p.teamId).length).toBeLessThanOrEqual(300);
    expect(out.players.velho).toBeUndefined();
    for (const t of Object.values(out.teams)) for (const id of [...t.playerIds, ...t.academyIds]) expect(out.players[id]).toBeDefined();
  }, 30_000);

  it('a IA não contrata salário acima do teto da folha', () => {
    const base = { ...createWorld('furia'), date: '2027-01-05' };
    const team = Object.values(base.teams).find((t) => t.hltvRank === 30)!;
    let w = { ...base, teams: { ...base.teams, [team.id]: { ...team, money: 3_000_000 } } };
    for (let s = 1; s <= 30; s++) w = aiMarketDay(w, 'furia', createRng(s)).world;
    expect(payroll(w, w.teams[team.id])).toBeLessThanOrEqual(Math.max(payroll(base, team), aiPayrollCap(w, w.teams[team.id])));
  });

  it('time da IA atrasado há 4 meses se reestrutura (dívida zera, folha cabe no patrocínio esperado)', () => {
    const base = { ...createWorld('furia'), date: '2027-03-01' };
    const t = Object.values(base.teams).find((x) => x.hltvRank === 28)!;
    const crisis = { ...t, money: -50_000, arrears: 900_000, lateMonths: 4, sponsors: [] };
    const w = { ...base, teams: { ...base.teams, [t.id]: crisis } };
    const after = monthlyFinance(w, createRng(1)).world;
    const out = after.teams[t.id];
    expect(out.arrears).toBeLessThan(payroll(base, t) + 1);
    expect(out.lateMonths).toBeLessThanOrEqual(1);
    expect(payroll(after, out)).toBeLessThanOrEqual(expectedSponsorIncome(out) * 1.3 + 1);
    // O seu time não se reestrutura sozinho.
    const mine = { ...base, teams: { ...base.teams, furia: { ...base.teams.furia, money: -50_000, arrears: 900_000, lateMonths: 4 } } };
    expect(monthlyFinance(mine, createRng(1)).world.teams.furia.lateMonths).toBeGreaterThan(0);
  });

  it('três anos de jogo: economia de pé (< 1/8 atrasados) e agentes livres sob controle', () => {
    let w = createWorld('furia', 3);
    for (let d = 0; d < 365 * 3; d++) w = dailyTick(w).world;
    const teams = Object.values(w.teams);
    expect(teams.filter((t) => t.lateMonths > 0).length).toBeLessThan(teams.length / 8);
    expect(Object.values(w.players).filter((p) => !p.teamId).length).toBeLessThanOrEqual(300);
  }, 180_000);
});
