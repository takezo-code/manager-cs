// Correções da revisão final do top 100.
import { describe, expect, it } from 'vitest';
import { buildYear } from '../calendar';
import { daysBetween } from '../date';
import { monthlyFinance, payroll } from '../finance/monthly';
import { expectedSponsorIncome } from '../finance/sponsors';
import { aiMarketDay, aiPayrollCap } from '../market/ai';
import { createRng } from '../rng';
import { createTournament, playDay } from '../tournament/run';
import { candidates, issueInvites, startEvents } from '../schedule';
import { rivalPreview } from '../staff/preview';
import { withAcademyTeams } from '../tier2/model';
import { createWorld, dailyTick } from '../season';
import type { World } from '../world';

/** Mundo de save antigo: só os 32 primeiros (e os agentes livres). */
function oldWorld(): World {
  const w = createWorld('furia');
  const keep = new Set(Object.values(w.teams).filter((t) => t.hltvRank <= 32).map((t) => t.id));
  const teams = Object.fromEntries(Object.entries(w.teams).filter(([id]) => keep.has(id)));
  const players = Object.fromEntries(Object.entries(w.players).filter(([, p]) => !p.teamId || keep.has(p.teamId)));
  return { ...w, teams, players, calendar: w.calendar.filter((e) => e.tier === 1) };
}

describe('Revisão do top 100', () => {
  it('C1: evento sem times suficientes é cancelado em vez de quebrar', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'challenger-na-03')!;
    const base = oldWorld();
    const w = { ...base, date: ev.startDate, calendar: [ev], teams: Object.fromEntries(Object.entries(base.teams).filter(([, t]) => t.region !== 'NA').slice(0, 3)) };
    const out = startEvents(issueInvites(w).world).world.calendar[0];
    expect(out.status).toBe('encerrado');
    expect(out.tournament).toBeNull();
  });

  it('C2: a prévia do analista funciona com rival academy', () => {
    const w = createWorld('furia');
    const p = rivalPreview(w, 'mouz-ac', 'x');
    expect(p.strong).toHaveLength(2);
    expect(withAcademyTeams(w, ['mouz-ac'])['mouz-ac'].name).toBe('MOUZ Academy');
  });

  it('I1: todo evento cabe nas datas do calendário (formato simulado até o campeão)', () => {
    const w = createWorld('furia');
    const ids = Object.values(w.teams).sort((a, b) => a.hltvRank - b.hltvRank).map((t) => t.id);
    const tooLong: string[] = [];
    const seen = new Set<string>();
    for (const ev of buildYear(2027)) {
      const key = `${ev.format}:${ev.teams}:${daysBetween(ev.startDate, ev.endDate)}`;
      if (seen.has(key)) continue;
      seen.add(key);
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

  it('top 20 só joga tier 1: nenhum evento tier 2/3 chama time do top 20', () => {
    const w = createWorld('furia');
    for (const ev of buildYear(2027).filter((e) => e.tier > 1))
      for (const id of candidates({ ...w, calendar: [ev] }, ev)) expect(w.teams[id]?.hltvRank ?? 999, `${ev.name}: ${id}`).toBeGreaterThan(20);
  });

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

  it('I5: título de tier 2/3 não dá bônus de MVP, staff nem reputação de evento grande', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'european-pro-league-03')!;
    let w = { ...createWorld('furia'), date: ev.startDate, calendar: [ev] };
    const before = w;
    for (let d = 0; d < 9; d++) w = dailyTick(w).world;
    const done = w.calendar.find((e) => e.id === ev.id)!;
    expect(done.tournament?.championId).toBeTruthy();
    expect(Object.values(w.players).filter((p) => p.mvpUntil && !before.players[p.id]?.mvpUntil)).toEqual([]);
    expect(w.staff).toEqual(before.staff);
  }, 30_000);

  it('I2: jogos contra academy aparecem nos resultados do dia, fora do histórico do ranking; notícia usa o nome', () => {
    const ev = buildYear(2027).find((e) => e.templateId === 'challenger-na-03')!;
    let w = { ...createWorld('furia'), date: ev.startDate, calendar: [ev] };
    let academyGames = 0;
    for (let d = 0; d < 4; d++) {
      const out = dailyTick(w);
      w = out.world;
      academyGames += Object.values(out.results).filter((r) => r.teamAId.endsWith('-ac') || r.teamBId.endsWith('-ac')).length;
    }
    expect(academyGames).toBeGreaterThan(0);
    expect(w.seriesLog.some((s) => s.winner.endsWith('-ac') || s.loser.endsWith('-ac'))).toBe(false);
    expect(w.news.some((n) => /[a-z0-9]+-ac/.test(JSON.stringify(n)))).toBe(false);
  }, 30_000);

  it('I4: na virada do ano, agentes livres velhos ou fracos se aposentam e sobram no máximo 300', () => {
    const base = { ...createWorld('furia'), date: '2027-12-31', calendar: [] };
    const extra = Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => {
        const p = Object.values(base.players).find((x) => !x.teamId)!;
        return [`fa${i}`, { ...p, id: `fa${i}`, age: 22 + (i % 6) }];
      }),
    );
    const old = Object.values(base.players).find((x) => !x.teamId)!;
    const w = { ...base, players: { ...base.players, ...extra, velho: { ...old, id: 'velho', age: 31 } } };
    const out = dailyTick(w).world;
    const free = Object.values(out.players).filter((p) => !p.teamId);
    expect(free.length).toBeLessThanOrEqual(300);
    expect(out.players.velho).toBeUndefined();
    for (const t of Object.values(out.teams)) for (const id of [...t.playerIds, ...t.academyIds]) expect(out.players[id]).toBeDefined();
  }, 30_000);

  it('I3: a IA não contrata salário acima do teto da folha', () => {
    const base = { ...createWorld('furia'), date: '2027-01-05' };
    const team = Object.values(base.teams).find((t) => t.hltvRank === 60)!;
    // Time rico em caixa (prêmio), mas com patrocínio de tier 2: não pode encher a folha de estrelas.
    let w = { ...base, teams: { ...base.teams, [team.id]: { ...team, money: 3_000_000 } } };
    for (let s = 1; s <= 30; s++) w = aiMarketDay(w, 'furia', createRng(s)).world;
    expect(payroll(w, w.teams[team.id])).toBeLessThanOrEqual(Math.max(payroll(base, team), aiPayrollCap(w, w.teams[team.id])));
  });

  it('I3: time da IA atrasado há 4 meses se reestrutura (dívida zera, folha cabe no patrocínio esperado)', () => {
    const base = { ...createWorld('furia'), date: '2027-03-01' };
    const t = Object.values(base.teams).find((x) => x.hltvRank === 90)!;
    const crisis = { ...t, money: -50_000, arrears: 900_000, lateMonths: 4, sponsors: [] };
    const w = { ...base, teams: { ...base.teams, [t.id]: crisis } };
    const out = monthlyFinance(w, createRng(1)).world.teams[t.id];
    // A dívida antiga some; no próprio mês ainda pode faltar a folha (sem patrocinador até o mês seguinte).
    expect(out.arrears).toBeLessThan(payroll(base, t) + 1);
    expect(out.lateMonths).toBeLessThanOrEqual(1);
    expect(payroll(monthlyFinance(w, createRng(1)).world, out)).toBeLessThanOrEqual(expectedSponsorIncome(out) * 1.3 + 1);
    // O seu time não se reestrutura sozinho.
    const mine = { ...base, teams: { ...base.teams, furia: { ...base.teams.furia, money: -50_000, arrears: 900_000, lateMonths: 4 } } };
    expect(monthlyFinance(mine, createRng(1)).world.teams.furia.lateMonths).toBeGreaterThan(0);
  });

  it('I3/I4: três anos de jogo, economia de pé (< 1/8 atrasados) e agentes livres sob controle', () => {
    let w = createWorld('furia', 3);
    for (let d = 0; d < 365 * 3; d++) w = dailyTick(w).world;
    const teams = Object.values(w.teams);
    expect(teams.filter((t) => t.lateMonths > 0).length).toBeLessThan(teams.length / 8);
    expect(Object.values(w.players).filter((p) => !p.teamId).length).toBeLessThan(500);
  }, 180_000);

  it('C1: save antigo (32 times) roda um ano sem tier 2/3, com todo evento tier 1 com campeão', () => {
    let w = oldWorld();
    while (w.date < '2027-12-31') w = dailyTick(w).world;
    expect(w.calendar.some((e) => e.tier > 1)).toBe(false);
    for (const e of w.calendar.filter((x) => x.startDate.startsWith('2027'))) expect(e.tournament?.championId, e.name).toBeTruthy();
  }, 60_000);
});
